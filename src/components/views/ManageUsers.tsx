import { 
    Building, ShieldCheck, User as UserIcon, Users, Eye, EyeClosed, MoreHorizontal, Pencil, 
    ShieldUser, Trash, UserPlus, Fingerprint, Lock, Shield, Settings, CheckSquare, 
    ListTodo, ClipboardCheck, Truck, BarChart3, Box, Crown, ChevronDown, ChevronRight,
    Wrench, Layers, AlertCircle, Edit3, ShieldAlert
} from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useMemo, useState } from 'react';
import { allPermissionKeys, type UserPermissions } from '@/types/sheets';
import type { ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useAuth } from '@/context/AuthContext';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { PuffLoader as Loader } from 'react-spinners';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Pill } from '../ui/pill';
import { fetchUsers, createUser, updateUser, deleteUser } from '@/services/userService';
import { fetchMasterOptions } from '@/services/masterService';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';

interface UsersTableData {
    id: number;
    username: string;
    name: string;
    password: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
    modify_access: 'EDIT' | 'VIEW';
    firmNameMatch: string;
    firm_access: string[];
    permissions: string[];
}

interface SystemPageConfig {
    id: string;
    name: string;
    description: string;
    viewKeys: string[];
    editKeys: string[];
}

interface SystemConfig {
    id: string;
    name: string;
    badgeBg: string;
    badgeText: string;
    icon: React.ReactNode;
    description: string;
    pages: SystemPageConfig[];
}

const SYSTEM_HIERARCHY: SystemConfig[] = [
    {
        id: 'master_settings',
        name: 'Master Settings & User Management',
        badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        badgeText: 'Master Settings',
        icon: <Users className="size-5 text-indigo-500" />,
        description: 'User access administration, user accounts, roles, and global permissions settings',
        pages: [
            {
                id: 'manage_users',
                name: 'Manage Users',
                description: 'User access administration, user accounts, and permissions settings',
                viewKeys: ['manageUsers'],
                editKeys: ['manageUsers'],
            },
            {
                id: 'working_calendar',
                name: 'Working Calendar',
                description: 'Configure organization working days and weekly off schedules',
                viewKeys: ['workingCalendar'],
                editKeys: ['workingCalendar'],
            },
            {
                id: 'holidays',
                name: 'Holidays',
                description: 'Manage company holidays excluded from task generation',
                viewKeys: ['holidays'],
                editKeys: ['holidays'],
            },
        ]
    },
    {
        id: 'store',
        name: 'Store Management System',
        badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        badgeText: 'Store Module',
        icon: <Box className="size-5 text-blue-500" />,
        description: 'Inventory control, indent approvals, purchase orders, store check-in/issue, and financial audits',
        pages: [
            {
                id: 'master_registry',
                name: 'Master Registry',
                description: 'Core master registry settings for Vendors, Items, Departments, and Corporate Profiles',
                viewKeys: ['masterRegistry'],
                editKeys: ['masterRegistry'],
            },
            {
                id: 'create_indent',
                name: 'Create Indent',
                description: 'Create store requisitions and material indents',
                viewKeys: ['createIndent'],
                editKeys: ['createIndent'],
            },
            {
                id: 'indent_approval',
                name: 'Indent Approval',
                description: 'Review, approve, or reject material indents',
                viewKeys: ['indentApprovalView'],
                editKeys: ['indentApprovalView', 'indentApprovalAction'],
            },
            {
                id: 'pending_indents',
                name: 'PO to Make / Pending Indents',
                description: 'View pending requisitions awaiting PO processing',
                viewKeys: ['pendingIndentsView'],
                editKeys: ['pendingIndentsView'],
            },
            {
                id: 'create_po',
                name: 'Create PO & Enquiry',
                description: 'Generate purchase orders and vendor quotation inquiries',
                viewKeys: ['createPo'],
                editKeys: ['createPo'],
            },
            {
                id: 'orders_view',
                name: 'Lifting & PO History',
                description: 'Track material lifting logs and purchase order history',
                viewKeys: ['ordersView'],
                editKeys: ['ordersView', 'poHistory'],
            },
            {
                id: 'vendor_rates',
                name: 'Vendor Rate Update',
                description: 'Update and approve vendor item rate lists',
                viewKeys: ['updateVendorView'],
                editKeys: ['updateVendorView', 'updateVendorAction'],
            },
            {
                id: 'technical_approval',
                name: 'Technical & Management Approval',
                description: 'Multi-stage technical ranking and management approval',
                viewKeys: ['threePartyApprovalView'],
                editKeys: ['threePartyApprovalView', 'threePartyApprovalAction'],
            },
            {
                id: 'pending_po',
                name: 'Pending PO Backlog',
                description: 'Track pending PO generation backlog',
                viewKeys: ['pendingPo'],
                editKeys: ['pendingPo'],
            },
            {
                id: 'store_issue',
                name: 'Store Issue & Return',
                description: 'Issue materials to doers/projects and handle store returns',
                viewKeys: ['storeIssue', 'storeIssueReturn'],
                editKeys: ['storeIssue', 'storeIssueReturn', 'issueData'],
            },
            {
                id: 'inventory',
                name: 'Stock Balance & Inventory',
                description: 'Monitor warehouse inventory stock levels',
                viewKeys: ['inventory'],
                editKeys: ['inventory'],
            },
            {
                id: 'store_in',
                name: 'Store Check (GRN) & HOD Check',
                description: 'Verify goods received notes and HOD sign-offs',
                viewKeys: ['storeIn', 'hodStoreApproval'],
                editKeys: ['storeIn', 'hodStoreApproval'],
            },
            {
                id: 'grn_rejection',
                name: 'Reject for GRN & Quality Control',
                description: 'Process rejected or damaged items during GRN check',
                viewKeys: ['receiveItemView'],
                editKeys: ['receiveItemView', 'receiveItemAction', 'insteadOfQualityCheckInReceivedItem'],
            },
            {
                id: 'store_out',
                name: 'Store Out Approval',
                description: 'Approve outgoing store dispatch requests',
                viewKeys: ['storeOutApprovalView'],
                editKeys: ['storeOutApprovalView', 'storeOutApprovalAction'],
            },
            {
                id: 'audits',
                name: 'Financial Audits & Tally Entry',
                description: 'Store audit data, re-auditing, Tally entries and mistake corrections',
                viewKeys: ['auditData', 'reauditData'],
                editKeys: ['auditData', 'againAuditing', 'reauditData', 'rectifyTheMistake', 'takeEntryByTelly', 'dbForPc'],
            },
            {
                id: 'finance_logistics',
                name: 'Logistics, Debit Notes & Payments',
                description: 'Debit notes, material returns/exchanges, freight payments, and bill clearance',
                viewKeys: ['sendDebitNote', 'billNotReceived'],
                editKeys: ['sendDebitNote', 'returnMaterialToParty', 'exchangeMaterials', 'fullKiting', 'makePayment'],
            },
        ]
    },
    {
        id: 'checklist',
        name: 'Checklist & Delegation System',
        badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        badgeText: 'Checklist Module',
        icon: <CheckSquare className="size-5 text-purple-500" />,
        description: 'Recurring checklist tasks, delegation assignments, doer submissions, and admin approval workflows',
        pages: [
            {
                id: 'checklist_dash',
                name: 'Checklist Operations Dashboard',
                description: 'Central operational dashboard for checklist and delegation tasks',
                viewKeys: ['checklistDash'],
                editKeys: ['checklistDash'],
            },
            {
                id: 'checklist_quick',
                name: 'Quick Task',
                description: 'Task management page to manage, edit, or delete existing task definitions',
                viewKeys: ['checklistQuickTask'],
                editKeys: ['checklistQuickTask'],
            },
            {
                id: 'checklist_assign',
                name: 'Assign Task',
                description: 'Configure task schedules, frequencies, attachments, and assignees',
                viewKeys: ['checklistAssign'],
                editKeys: ['checklistAssign'],
            },
            {
                id: 'checklist_submit_check',
                name: 'Checklist Doer Submission',
                description: 'Perform assigned recurring checklist tasks with proof uploads',
                viewKeys: ['checklistSubmitChecklist'],
                editKeys: ['checklistSubmitChecklist'],
            },
            {
                id: 'checklist_submit_del',
                name: 'Delegation Doer Submission',
                description: 'Perform assigned one-time delegation tasks with audio/photo proof',
                viewKeys: ['checklistSubmitDelegation'],
                editKeys: ['checklistSubmitDelegation'],
            },
            {
                id: 'checklist_approval',
                name: 'Admin Task Approval',
                description: 'Verify, approve, or reject completed tasks and review extension requests',
                viewKeys: ['checklistApproval'],
                editKeys: ['checklistApproval'],
            },
        ]
    }
];

export default function ManageUsers() {
    const { user: currentUser, refreshUser } = useAuth();

    const [tableData, setTableData] = useState<UsersTableData[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UsersTableData | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [allProjectOptions, setAllProjectOptions] = useState<{ id: number; name: string }[]>([]);
    const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({
        master_settings: true,
        store: true,
        checklist: true,
    });
    const [pageAccessModes, setPageAccessModes] = useState<Record<string, 'VIEW' | 'EDIT'>>({});

    const permittedProjects = useMemo(() => {
        return [...allProjectOptions].sort((a, b) => a.name.localeCompare(b.name));
    }, [allProjectOptions]);

    useEffect(() => {
        fetchMasterOptions()
            .then((masterOptions) => setAllProjectOptions(masterOptions.firmObjects || []))
            .catch((error) => {
                console.error('Failed to fetch project options:', error);
                toast.error('Failed to load project options');
            });
    }, []);

    useEffect(() => {
        if (!openDialog) {
            setSelectedUser(null);
            setShowPassword(false);
        }
    }, [openDialog]);

    async function fetchUser() {
        setDataLoading(true);
        try {
            const users = await fetchUsers();
            const sortedUsers = users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setTableData(
                sortedUsers.map((user) => {
                    const permissionKeys = allPermissionKeys.filter(
                        (key) => user[key as keyof UserPermissions] === true
                    );

                    const userRole: 'SUPER_ADMIN' | 'ADMIN' | 'USER' =
                        user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'USER'
                            ? user.role
                            : (user.administrate ? 'SUPER_ADMIN' : 'USER');

                    return {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        password: user.password,
                        role: userRole,
                        modify_access: user.modify_access || 'EDIT',
                        firmNameMatch: user.firmNameMatch,
                        firm_access: (user.firm_access || []).map(String),
                        permissions: permissionKeys,
                    };
                })
            );
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setDataLoading(false);
        }
    }

    useEffect(() => {
        fetchUser();
    }, []);

    const columns: ColumnDef<UsersTableData>[] = [
        {
            accessorKey: 'name',
            header: 'User Profile',
            cell: ({ row }) => (
                <div className="flex items-center gap-3 justify-start pl-4 group">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform duration-300 group-hover:scale-110 ring-4 ring-transparent group-hover:ring-primary/5">
                        {row.original.role === 'SUPER_ADMIN' ? (
                            <Crown size={18} className="text-purple-600 dark:text-purple-400" />
                        ) : row.original.role === 'ADMIN' ? (
                            <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                        ) : (
                            <UserIcon size={18} />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 text-left">
                        <span className="font-bold text-sm truncate tracking-tight">{row.original.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate opacity-70 group-hover:opacity-100 transition-opacity">@{row.original.username}</span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'role',
            header: 'System Role',
            cell: ({ row }) => {
                const role = row.original.role;
                if (role === 'SUPER_ADMIN') {
                    return (
                        <Pill variant="primary" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-sm shadow-purple-500/20 font-bold px-2.5 py-1">
                            <Crown size={12} className="mr-1 inline shrink-0" /> SUPER ADMIN
                        </Pill>
                    );
                }
                if (role === 'ADMIN') {
                    return (
                        <Pill variant="primary" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-none shadow-sm shadow-blue-500/20 font-bold px-2.5 py-1">
                            <ShieldCheck size={12} className="mr-1 inline shrink-0" /> ADMIN
                        </Pill>
                    );
                }
                return (
                    <Pill variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold px-2.5 py-1">
                        <UserIcon size={12} className="mr-1 inline shrink-0" /> USER
                    </Pill>
                );
            }
        },
        {
            accessorKey: 'firm_access',
            header: 'Project Scope',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-sm justify-start pl-4">
                    <Building size={14} className="text-muted-foreground shrink-0" />
                    <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        row.original.role === 'SUPER_ADMIN' || row.original.firm_access.length === 0
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : "bg-muted text-muted-foreground border-border"
                    )}>
                        {row.original.role === 'SUPER_ADMIN'
                            ? "All Projects (Global)"
                            : row.original.firm_access.length > 0
                                ? `${row.original.firm_access.length} Project(s)`
                                : "No Access"}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'permissions',
            header: 'Page Access Level',
            cell: ({ row }) => {
                const permissions = row.original.permissions;
                const isSuperAdmin = row.original.role === 'SUPER_ADMIN';

                if (isSuperAdmin) {
                    return (
                        <div className="grid place-items-start pl-4">
                            <Pill variant="primary" className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-bold text-[11px]">
                                Full Unrestricted Access
                            </Pill>
                        </div>
                    );
                }

                return (
                    <div className="grid place-items-start pl-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <Pill variant="secondary" className="bg-secondary/70 text-foreground font-bold text-[11px]">
                                {permissions.length} Page Permission(s)
                            </Pill>
                            {permissions.length > 0 && (
                                <HoverCard openDelay={100}>
                                    <HoverCardTrigger asChild>
                                        <div className="cursor-pointer">
                                            <Pill variant="default" className="text-[10px] bg-muted hover:bg-muted/80">View Details</Pill>
                                        </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80 p-4 shadow-xl border-primary/10 bg-background/95 backdrop-blur-md">
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Enabled System Permissions</h4>
                                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                                {permissions.map((perm, i) => (
                                                    <Pill key={i} variant="secondary" className="text-[10px]">{perm}</Pill>
                                                ))}
                                            </div>
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => {
                                setSelectedUser(user);
                                setOpenDialog(true);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            disabled={user.username === 'admin' || user.username === currentUser.username}
                            onClick={async () => {
                                if (confirm(`Are you sure you want to permanently delete user "${user.name}"?`)) {
                                    try {
                                        await deleteUser(user.id);
                                        toast.success(`User deleted successfully`);
                                        fetchUser();
                                    } catch {
                                        toast.error('Failed to delete user');
                                    }
                                }
                            }}
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                asChild
                                disabled={
                                    user.username === 'admin' || user.username === currentUser.username
                                }
                            >
                                <Button variant="ghost" className="h-8 w-8 p-0 mr-4 hover:bg-primary/10 hover:text-primary transition-colors">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-1">
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2 focus:bg-primary/5 focus:text-primary"
                                    onClick={() => {
                                        setSelectedUser(user);
                                        setOpenDialog(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" /> Edit User Access
                                </DropdownMenuItem>
                                <Separator className="my-1" />
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2 focus:bg-destructive/5 focus:text-destructive text-destructive"
                                    onClick={async () => {
                                        if (confirm(`Are you sure you want to permanently delete user "${user.name}"? This action cannot be undone.`)) {
                                            try {
                                                if (user.username === 'admin') {
                                                    throw new Error();
                                                }
                                                await deleteUser(user.id);
                                                toast.success(`User deleted successfully`);
                                                fetchUser();
                                            } catch {
                                                toast.error('Failed to delete user');
                                            }
                                        }
                                    }}
                                >
                                    <Trash className="h-4 w-4" /> Delete User
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

    const schema = z.object({
        name: z.string().min(1, 'Full name is required'),
        username: z.string().min(3, 'Username must be at least 3 characters'),
        password: z.string().min(4, 'Password must be at least 4 characters'),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']),
        firmNameMatch: z.string().optional(),
        firm_access: z.array(z.string()),
        permissions: z.array(z.string()),
    });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            username: '',
            name: '',
            password: '',
            role: 'USER',
            firmNameMatch: '',
            firm_access: [],
            permissions: [],
        },
    });

    useEffect(() => {
        const initialModes: Record<string, 'VIEW' | 'EDIT'> = {};
        const userPerms = selectedUser?.permissions || [];
        const isUserViewOnly = selectedUser?.modify_access === 'VIEW';

        SYSTEM_HIERARCHY.forEach((system) => {
            system.pages.forEach((page) => {
                if (isUserViewOnly) {
                    initialModes[page.id] = 'VIEW';
                } else if (page.editKeys.length > page.viewKeys.length) {
                    const hasAllEdit = page.editKeys.every((k) => userPerms.includes(k));
                    initialModes[page.id] = hasAllEdit ? 'EDIT' : 'VIEW';
                } else {
                    initialModes[page.id] = 'EDIT';
                }
            });
        });
        setPageAccessModes(initialModes);

        if (selectedUser) {
            form.reset({
                username: selectedUser.username,
                name: selectedUser.name,
                password: selectedUser.password,
                role: selectedUser.role || 'USER',
                firmNameMatch: selectedUser.firmNameMatch,
                firm_access: (selectedUser.firm_access || []).map(String),
                permissions: selectedUser.permissions || [],
            });
            return;
        }
        form.reset({
            name: '',
            username: '',
            password: '',
            role: 'USER',
            firmNameMatch: '',
            firm_access: [],
            permissions: [],
        });
    }, [selectedUser]);

    async function onSubmit(value: z.infer<typeof schema>) {
        if (
            tableData.map((d) => d.username).includes(value.username) &&
            (!selectedUser || value.username !== selectedUser.username)
        ) {
            toast.error('Username already exists. Please choose a unique one.');
            return;
        }

        const effectivePermissions = value.role === 'SUPER_ADMIN'
            ? [...allPermissionKeys]
            : value.permissions;

        let computedModifyAccess: 'EDIT' | 'VIEW' = 'EDIT';
        if (value.role === 'USER') {
            const allPages = SYSTEM_HIERARCHY.flatMap((s) => s.pages);
            const enabledPages = allPages.filter((p) =>
                p.viewKeys.some((k) => effectivePermissions.includes(k)) ||
                p.editKeys.some((k) => effectivePermissions.includes(k))
            );

            const hasAnyEditPage = enabledPages.some((p) => (pageAccessModes[p.id] || 'EDIT') === 'EDIT');
            computedModifyAccess = hasAnyEditPage ? 'EDIT' : 'VIEW';
        }

        // Calculate system_access and page_access JSON structures
        const activeSystemAccess: string[] = value.role === 'SUPER_ADMIN' ? ['ALL'] : [];
        const activePageAccess: Record<string, 'VIEW' | 'EDIT'> = value.role === 'SUPER_ADMIN' ? { ALL: 'EDIT' } : {};

        if (value.role !== 'SUPER_ADMIN') {
            SYSTEM_HIERARCHY.forEach((system) => {
                let systemHasAccess = false;
                system.pages.forEach((page) => {
                    const isEnabled = page.viewKeys.some((k) => effectivePermissions.includes(k)) ||
                        page.editKeys.some((k) => effectivePermissions.includes(k));

                    if (isEnabled) {
                        systemHasAccess = true;
                        const mode = pageAccessModes[page.id] || 'EDIT';
                        activePageAccess[page.id] = mode;
                    }
                });
                if (systemHasAccess) {
                    activeSystemAccess.push(system.id);
                }
            });
        }

        const userData: any = {
            username: value.username,
            name: value.name,
            password: value.password,
            role: value.role,
            modify_access: computedModifyAccess,
            firmNameMatch: value.firmNameMatch || '',
            firm_access: value.firm_access.map(String).filter(Boolean),
            system_access: activeSystemAccess,
            page_access: activePageAccess,
            administrate: value.role === 'SUPER_ADMIN' || effectivePermissions.includes('administrate'),
        };

        allPermissionKeys.forEach((perm) => {
            userData[perm] = effectivePermissions.includes(perm);
        });

        try {
            if (selectedUser) {
                await updateUser(selectedUser.id, userData);
                if (selectedUser.username === currentUser.username) {
                    await refreshUser();
                }
                toast.success('User updated successfully');
            } else {
                await createUser(userData);
                toast.success('New user profile created');
            }
            setOpenDialog(false);
            fetchUser();
        } catch (error) {
            console.error('Error saving user:', error);
            toast.error('Caught an error while saving user profile');
        }
    }

    function onError(e: any) {
        console.error('Form errors:', e);
        toast.error('Validation failed. Please check the required form fields.');
    }

    const currentRole = form.watch('role');
    const currentPermissions = form.watch('permissions') || [];

    // Helper functions for page access logic
    const isPageEnabled = (page: SystemPageConfig) => {
        if (currentRole === 'SUPER_ADMIN') return true;
        return page.viewKeys.some((k) => currentPermissions.includes(k)) ||
               page.editKeys.some((k) => currentPermissions.includes(k));
    };

    const getPageAccessMode = (page: SystemPageConfig): 'VIEW' | 'EDIT' => {
        if (currentRole === 'SUPER_ADMIN') return 'EDIT';
        return pageAccessModes[page.id] || 'EDIT';
    };

    const handleTogglePageAccess = (page: SystemPageConfig, checked: boolean) => {
        const set = new Set(currentPermissions);
        if (checked) {
            // Default to current page access mode when checked
            const mode = pageAccessModes[page.id] || 'EDIT';
            page.viewKeys.forEach((k) => set.add(k));
            if (mode === 'EDIT') {
                page.editKeys.forEach((k) => set.add(k));
            }
        } else {
            // Remove all keys for this page
            page.viewKeys.forEach((k) => set.delete(k));
            page.editKeys.forEach((k) => set.delete(k));
        }
        form.setValue('permissions', Array.from(set));
    };

    const handleSetPageAccessMode = (page: SystemPageConfig, mode: 'VIEW' | 'EDIT') => {
        setPageAccessModes((prev) => ({ ...prev, [page.id]: mode }));

        const set = new Set(currentPermissions);
        page.viewKeys.forEach((k) => set.add(k));
        
        if (mode === 'EDIT') {
            page.editKeys.forEach((k) => set.add(k));
        } else {
            // For VIEW mode, remove action keys that differentiate edit from view
            const actionKeys = page.editKeys.filter((k) => !page.viewKeys.includes(k));
            actionKeys.forEach((k) => set.delete(k));
        }
        form.setValue('permissions', Array.from(set));
    };

    const handleToggleSystemAllPages = (system: SystemConfig, checked: boolean) => {
        const set = new Set(currentPermissions);
        system.pages.forEach((page) => {
            if (checked) {
                page.viewKeys.forEach((k) => set.add(k));
                page.editKeys.forEach((k) => set.add(k));
            } else {
                page.viewKeys.forEach((k) => set.delete(k));
                page.editKeys.forEach((k) => set.delete(k));
            }
        });
        form.setValue('permissions', Array.from(set));
    };

    return (
        <div className="h-full space-y-6">
            <Dialog open={openDialog} onOpenChange={(open) => setOpenDialog(open)}>
                <div className="relative">
                    <Heading
                        heading="Manage Users & Permissions"
                        subtext="Create users, assign system roles, and configure granular multi-system page access"
                    >
                        <div className="flex -space-x-2">
                             <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 text-white transform -rotate-12">
                                <ShieldUser size={40} />
                            </div>
                        </div>
                    </Heading>

                    <div className="mt-8">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={['name', 'username', 'role', 'firmNameMatch']}
                            dataLoading={dataLoading}
                            className="h-[calc(100dvh-200px)] overflow-hidden rounded-xl border-primary/5 bg-card shadow-xl shadow-black/5"
                            extraActions={
                                <Button
                                    className="h-10 px-6 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
                                    onClick={() => {
                                        setOpenDialog(true);
                                        setSelectedUser(null);
                                    }}
                                >
                                    <UserPlus size={18} />
                                    <span className="hidden sm:inline">Add New User</span>
                                </Button>
                            }
                        />
                    </div>
                </div>

                <DialogContent className="sm:max-w-4xl max-h-[90dvh] overflow-y-auto custom-scrollbar p-0 border-none bg-background shadow-2xl">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col h-full">
                            <div className="p-6 md:p-8 space-y-8">
                                <DialogHeader className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                            {selectedUser ? <Pencil size={22} /> : <UserPlus size={22} />}
                                        </div>
                                        <div>
                                            <DialogTitle className="text-2xl font-bold tracking-tight">
                                                {selectedUser ? 'Edit User Profile & Access' : 'Register New User'}
                                            </DialogTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Configure user identification, assigned system role, project access, and granular page permissions.
                                            </p>
                                        </div>
                                    </div>
                                </DialogHeader>

                                {/* User Details & Role Section */}
                                <div className="grid md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-2xl border border-border/50">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                                    <Fingerprint size={14} className="text-primary" /> Full Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input className="bg-background" placeholder="e.g. John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                                    <UserIcon size={14} className="text-primary" /> Username
                                                </FormLabel>
                                                <FormControl>
                                                    <Input className="bg-background" placeholder="johndoe123" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                                    <Lock size={14} className="text-primary" /> Password
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? 'text' : 'password'}
                                                            className="bg-background pr-10"
                                                            placeholder="••••••••"
                                                            {...field}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setShowPassword(!showPassword);
                                                            }}
                                                        >
                                                            {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Role Selector (Replaces Modify Access) */}
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                                    <Crown size={14} className="text-purple-600 dark:text-purple-400" /> System Role
                                                </FormLabel>
                                                <Select value={field.value} onValueChange={(val) => {
                                                    field.onChange(val);
                                                    if (val === 'SUPER_ADMIN') {
                                                        form.setValue('permissions', [...allPermissionKeys]);
                                                    }
                                                }}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-background w-full">
                                                            <SelectValue placeholder="Select system role" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="SUPER_ADMIN" className="font-semibold text-purple-700 dark:text-purple-300">
                                                            👑 SUPER ADMIN — Full control over every system & user management
                                                        </SelectItem>
                                                        <SelectItem value="ADMIN" className="font-semibold text-blue-700 dark:text-blue-300">
                                                            🛡️ ADMIN — Administrative access (View & Edit permitted pages)
                                                        </SelectItem>
                                                        <SelectItem value="USER" className="font-semibold text-slate-700 dark:text-slate-300">
                                                            👤 USER — Standard user with custom page-level permissions
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Permitted Projects (Firm Access) - FIXED SELECTION ISSUE */}
                                    <div className="md:col-span-2 space-y-4 pt-2 border-t border-border/40">
                                        <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                            <Building size={14} className="text-primary" /> Permitted Projects (Firm Scope)
                                        </FormLabel>
                                        
                                        {permittedProjects.length > 0 && (
                                            <FormField
                                                control={form.control}
                                                name="firm_access"
                                                render={({ field }) => {
                                                    const selectedFirms = (field.value || []).map(String);
                                                    const allSelected = permittedProjects.length > 0 && 
                                                        permittedProjects.every((p) => selectedFirms.includes(String(p.id)) || selectedFirms.includes(p.name));

                                                    return (
                                                        <FormItem className="flex items-center justify-between rounded-xl border bg-background p-3">
                                                            <div className="space-y-0.5">
                                                                <FormLabel htmlFor="select-all-projects" className="text-sm font-bold cursor-pointer">
                                                                    Select All Projects
                                                                </FormLabel>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    Grant access to every project listed in the Master Registry.
                                                                </p>
                                                            </div>
                                                            <FormControl>
                                                                <Checkbox
                                                                    id="select-all-projects"
                                                                    checked={allSelected}
                                                                    onCheckedChange={(checked) => {
                                                                        field.onChange(checked ? permittedProjects.map(p => String(p.id)) : []);
                                                                    }}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    );
                                                }}
                                            />
                                        )}

                                        <div className="bg-background border rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar grid sm:grid-cols-2 gap-3">
                                            {permittedProjects.map((firm) => (
                                                <FormField
                                                    key={firm.id}
                                                    control={form.control}
                                                    name="firm_access"
                                                    render={({ field }) => {
                                                        const values = (field.value || []).map(String);
                                                        const firmIdStr = String(firm.id);
                                                        const checked = values.includes(firmIdStr) || values.includes(firm.name);

                                                        return (
                                                            <FormItem className="flex items-center space-x-2.5 space-y-0 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/60">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        id={`firm-access-${firm.id}`}
                                                                        checked={checked}
                                                                        onCheckedChange={(isChecked) => {
                                                                            if (isChecked) {
                                                                                field.onChange(Array.from(new Set([...values, firmIdStr])));
                                                                            } else {
                                                                                field.onChange(values.filter((v) => v !== firmIdStr && v !== firm.name));
                                                                            }
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel htmlFor={`firm-access-${firm.id}`} className="text-xs font-semibold leading-none cursor-pointer select-none">
                                                                    {firm.name}
                                                                </FormLabel>
                                                            </FormItem>
                                                        );
                                                    }}
                                                />
                                            ))}
                                            {permittedProjects.length === 0 && (
                                                <p className="text-xs text-muted-foreground italic col-span-2 text-center py-4">No projects found in Master Registry</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Hierarchical Multi-System Page Permissions Interface */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                                <Layers size={18} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg tracking-tight">System & Page Permissions Interface</h3>
                                                <p className="text-xs text-muted-foreground">Order: Systems Permissions → Page → Edit / View Access</p>
                                            </div>
                                        </div>
                                        {currentRole !== 'SUPER_ADMIN' && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-xs gap-1.5 h-8"
                                                onClick={() => {
                                                    const allKeys = [...allPermissionKeys];
                                                    const isAll = currentPermissions.length === allKeys.length;
                                                    form.setValue('permissions', isAll ? [] : allKeys);
                                                }}
                                            >
                                                <CheckSquare size={14} />
                                                {currentPermissions.length === allPermissionKeys.length ? 'Deselect All Pages' : 'Grant All Pages'}
                                            </Button>
                                        )}
                                    </div>

                                    {currentRole === 'SUPER_ADMIN' ? (
                                        <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center gap-3">
                                            <Crown className="size-6 text-purple-600 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-purple-900 dark:text-purple-200">SUPER ADMIN Unrestricted System Access</p>
                                                <p className="text-xs text-purple-700 dark:text-purple-300">
                                                    Users with the Super Admin role automatically receive full administrative access and edit rights across all systems and pages.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {SYSTEM_HIERARCHY.map((system) => {
                                                const isExpanded = expandedSystems[system.id] ?? true;
                                                const systemPages = system.pages;
                                                const enabledCount = systemPages.filter((p) => isPageEnabled(p)).length;

                                                return (
                                                    <Card key={system.id} className="border border-border/70 shadow-sm overflow-hidden">
                                                        <div className="p-4 bg-muted/40 flex items-center justify-between border-b border-border/50">
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    type="button"
                                                                    className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground"
                                                                    onClick={() => setExpandedSystems((prev) => ({ ...prev, [system.id]: !isExpanded }))}
                                                                >
                                                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                                </button>
                                                                <div className="p-2 rounded-lg bg-background shadow-xs border border-border/50">
                                                                    {system.icon}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-bold text-sm text-foreground">{system.name}</h4>
                                                                        <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border", system.badgeBg)}>
                                                                            {system.badgeText}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-muted-foreground line-clamp-1">{system.description}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                                                                    {enabledCount} / {systemPages.length} pages enabled
                                                                </span>
                                                                <div className="flex items-center gap-2 pl-3 border-l border-border/60">
                                                                    <Checkbox
                                                                        id={`sys-all-${system.id}`}
                                                                        checked={enabledCount === systemPages.length}
                                                                        onCheckedChange={(chk) => handleToggleSystemAllPages(system, !!chk)}
                                                                    />
                                                                    <label htmlFor={`sys-all-${system.id}`} className="text-xs font-bold cursor-pointer select-none">
                                                                        Select All
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <CardContent className="p-4 space-y-3 bg-background">
                                                                <div className="grid gap-2">
                                                                    {system.pages.map((page) => {
                                                                        const enabled = isPageEnabled(page);
                                                                        const accessMode = getPageAccessMode(page);

                                                                        return (
                                                                            <div
                                                                                key={page.id}
                                                                                className={cn(
                                                                                    "p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                                                                                    enabled
                                                                                        ? "bg-muted/20 border-primary/20 shadow-2xs"
                                                                                        : "bg-background border-border/40 opacity-75 hover:opacity-100"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-start gap-3">
                                                                                    <Checkbox
                                                                                        id={`page-enable-${page.id}`}
                                                                                        checked={enabled}
                                                                                        className="mt-0.5"
                                                                                        onCheckedChange={(chk) => handleTogglePageAccess(page, !!chk)}
                                                                                    />
                                                                                    <div>
                                                                                        <label htmlFor={`page-enable-${page.id}`} className="text-xs font-bold text-foreground cursor-pointer hover:text-primary transition-colors">
                                                                                            {page.name}
                                                                                        </label>
                                                                                        <p className="text-[11px] text-muted-foreground">{page.description}</p>
                                                                                    </div>
                                                                                </div>

                                                                                {enabled && (
                                                                                    <div className="flex items-center gap-2 self-end sm:self-center bg-background p-1 rounded-lg border border-border/60 shrink-0">
                                                                                        <button
                                                                                            type="button"
                                                                                            className={cn(
                                                                                                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                                                                                                accessMode === 'VIEW'
                                                                                                    ? "bg-blue-600 text-white shadow-2xs font-bold"
                                                                                                    : "text-muted-foreground hover:bg-muted"
                                                                                            )}
                                                                                            onClick={() => handleSetPageAccessMode(page, 'VIEW')}
                                                                                        >
                                                                                            <Eye size={12} /> View Only
                                                                                        </button>

                                                                                        <button
                                                                                            type="button"
                                                                                            className={cn(
                                                                                                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                                                                                                accessMode === 'EDIT'
                                                                                                    ? "bg-purple-600 text-white shadow-2xs"
                                                                                                    : "text-muted-foreground hover:bg-muted"
                                                                                            )}
                                                                                            onClick={() => handleSetPageAccessMode(page, 'EDIT')}
                                                                                        >
                                                                                            <Edit3 size={12} /> Edit (View & Edit)
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </CardContent>
                                                        )}
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="p-6 md:p-8 bg-muted/50 border-t items-center gap-3">
                                <DialogClose asChild>
                                    <Button variant="ghost" className="px-6">Cancel</Button>
                                </DialogClose>

                                <Button 
                                    type="submit" 
                                    className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    disabled={form.formState.isSubmitting}
                                >
                                    {form.formState.isSubmitting ? (
                                        <div className="flex items-center gap-2">
                                            <Loader size={16} color="currentColor" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        selectedUser ? 'Save Changes' : 'Create User Profile'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
