import React, { useState } from 'react';
import {
    Store,
    CheckSquare,
    FileText,
    Wallet,
    ChevronDown,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Button } from '@/shared/components/ui/button';

export interface SystemItem {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    path: string;
}

export const availableSystems: SystemItem[] = [
    {
        id: 'store',
        name: 'Store Management',
        icon: <Store size={18} className="text-blue-600" />,
        description: 'Procurement, Indents, Stock & POs',
        path: '/',
    },
    {
        id: 'checklist',
        name: 'Checklist & Delegation',
        icon: <CheckSquare size={18} className="text-emerald-500" />,
        description: 'Daily Checklists & Tasks',
        path: '/checklist',
    },
    {
        id: 'document',
        name: 'Document & Subscription',
        icon: <FileText size={18} className="text-purple-500" />,
        description: 'Documents, Contracts & Subscriptions',
        path: '/document',
    },
    {
        id: 'petty_cash',
        name: 'Petty Cash',
        icon: <Wallet size={18} className="text-amber-500" />,
        description: 'Small Expenses & Voucher Logging',
        path: '/petty-cash',
    },
];

export function SystemSwitcher() {
    const [currentSystem, setCurrentSystem] = useState<SystemItem>(availableSystems[0]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-left truncate">
                        {currentSystem.icon}
                        <div className="truncate">
                            <p className="text-xs font-semibold text-gray-900 leading-none truncate">
                                {currentSystem.name}
                            </p>
                        </div>
                    </div>
                    <ChevronDown size={14} className="text-gray-500 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-1">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Available Business Systems
                </div>
                {availableSystems.map((system) => (
                    <DropdownMenuItem
                        key={system.id}
                        onClick={() => setCurrentSystem(system)}
                        className={`flex items-start gap-3 p-2 cursor-pointer rounded-md transition-colors ${
                            currentSystem.id === system.id
                                ? 'bg-blue-50 text-blue-900 font-medium'
                                : 'hover:bg-gray-50'
                        }`}
                    >
                        <div className="mt-0.5">{system.icon}</div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold">{system.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                                {system.description}
                            </span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
