import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    ListTodo,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    ShieldCheck,
    ArrowRight,
    TrendingUp,
    Search,
    User as UserIcon,
    Filter,
    CheckSquare,
    ClipboardCheck,
    Layers,
    ChevronDown,
    Calendar,
    Briefcase,
    RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Heading from '@/components/element/Heading';
import TaskCard from '@/components/element/TaskCard';
import { useAuth } from '@/context/AuthContext';
import { useChecklistData } from '@/context/ChecklistContext';
import { isChecklistAdmin, isChecklistSuperAdmin } from '@/lib/roleAccess';
import { hasPageAccess } from '@/components/element/PermissionGuard';
import { cn } from '@/lib/utils';
import { toDateOnly, getTimeBucket } from '@/lib/checklistBuckets';

type DashboardMode = 'all' | 'checklist' | 'delegation';
type DatePreset = 'mtd' | 'full_month' | 'today' | '7days' | 'all';

/** Dot Matrix Pattern SVG component for bottom-right card graphic */
function DotMatrixPattern({ colorClass }: { colorClass: string }) {
    return (
        <svg
            className={cn('absolute -bottom-1 -right-1 size-16 opacity-30 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none', colorClass)}
            fill="currentColor"
            viewBox="0 0 48 48"
        >
            <circle cx="6" cy="6" r="2" />
            <circle cx="18" cy="6" r="2" />
            <circle cx="30" cy="6" r="2" />
            <circle cx="42" cy="6" r="2" />
            <circle cx="6" cy="18" r="2" />
            <circle cx="18" cy="18" r="2" />
            <circle cx="30" cy="18" r="2" />
            <circle cx="42" cy="18" r="2" />
            <circle cx="6" cy="30" r="2" />
            <circle cx="18" cy="30" r="2" />
            <circle cx="30" cy="30" r="2" />
            <circle cx="42" cy="30" r="2" />
            <circle cx="6" cy="42" r="2" />
            <circle cx="18" cy="42" r="2" />
            <circle cx="30" cy="42" r="2" />
            <circle cx="42" cy="42" r="2" />
        </svg>
    );
}

interface MetricCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: any;
    cardBg: string;
    borderClass: string;
    iconGradient: string;
    iconShadow: string;
    textColor: string;
    dotColor: string;
    mode: DashboardMode;
    checklistCount: number;
    delegationCount: number;
    onNavigate: (path: string) => void;
}

function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    cardBg,
    borderClass,
    iconGradient,
    iconShadow,
    textColor,
    dotColor,
    mode,
    checklistCount,
    delegationCount,
    onNavigate,
}: MetricCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleMouseEnter = () => {
        if (!cardRef.current) return;
        const iconEl = cardRef.current.querySelector('.metric-icon-box');
        if (iconEl) {
            gsap.to(iconEl, { scale: 1.12, rotate: -4, duration: 0.25, ease: 'back.out(1.7)' });
        }
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        const iconEl = cardRef.current.querySelector('.metric-icon-box');
        if (iconEl) {
            gsap.to(iconEl, { scale: 1, rotate: 0, duration: 0.25, ease: 'power2.out' });
        }
    };

    const handleCardClick = () => {
        if (mode === 'checklist') {
            onNavigate('/checklist/submit/checklist');
        } else if (mode === 'delegation') {
            onNavigate('/checklist/submit/delegation');
        }
        // In 'all' mode, Popover handles open/close
    };

    const cardInnerMarkup = (
        <div
            ref={cardRef}
            onClick={handleCardClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                'dashboard-card group relative overflow-hidden transition-all duration-300 border shadow-2xs hover:shadow-xl hover:-translate-y-1.5 cursor-pointer rounded-[22px] p-5 flex flex-col justify-between',
                cardBg,
                borderClass
            )}
        >
            {/* Top Icon Badge - Soft squircle with vibrant gradient */}
            <div>
                <div className="flex items-center justify-between">
                    <div className={cn('metric-icon-box p-3 rounded-2xl text-white shadow-md transition-transform', iconGradient, iconShadow)}>
                        <Icon className="size-5" />
                    </div>

                    {mode === 'all' && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground flex items-center gap-1 border border-border/50">
                            <Layers size={10} /> Choose Route
                        </span>
                    )}
                </div>

                {/* Title */}
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/90 mt-4">{title}</p>

                {/* Value & Hover Arrow */}
                <div className="flex items-baseline justify-between mt-1">
                    <p className={cn('text-3xl font-black tracking-tight tabular-nums', textColor)}>{value}</p>
                    <ArrowRight className="size-4 text-muted-foreground/60 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                </div>
            </div>

            {/* Subtitle */}
            <p className="text-[11px] font-medium text-muted-foreground/80 mt-2 truncate relative z-10">{subtitle}</p>

            {/* Bottom-Right Dot Matrix Pattern Graphic */}
            <DotMatrixPattern colorClass={dotColor} />
        </div>
    );

    if (mode === 'all') {
        return (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    {cardInnerMarkup}
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 rounded-2xl shadow-xl border bg-card/95 backdrop-blur-md z-50 animate-in fade-in-50 zoom-in-95">
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">{title} Navigation</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                                {value} Total
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Select destination system:</p>

                        <div className="grid grid-cols-1 gap-2 pt-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setPopoverOpen(false);
                                    onNavigate('/checklist/submit/checklist');
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl border bg-sky-50/60 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border-sky-200 dark:border-sky-800 text-xs font-bold text-sky-900 dark:text-sky-200 transition-all hover:scale-[1.02]"
                            >
                                <span className="flex items-center gap-2">
                                    <CheckSquare size={15} className="text-sky-600" />
                                    Checklists
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white font-black text-[11px] tabular-nums shadow-2xs">
                                    {checklistCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPopoverOpen(false);
                                    onNavigate('/checklist/submit/delegation');
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl border bg-purple-50/60 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-900 dark:text-purple-200 transition-all hover:scale-[1.02]"
                            >
                                <span className="flex items-center gap-2">
                                    <ClipboardCheck size={15} className="text-purple-600" />
                                    Delegations
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-black text-[11px] tabular-nums shadow-2xs">
                                    {delegationCount}
                                </span>
                            </button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    return cardInnerMarkup;
}

/** Multi-segment SVG Radial Ring showing task completion breakdown */
function MultiSegmentRadialRing({
    completed,
    pending,
    notDone,
    overdue,
    loading,
}: {
    completed: number;
    pending: number;
    notDone: number;
    overdue: number;
    loading: boolean;
}) {
    const total = completed + pending + notDone + overdue;
    const size = 160;
    const strokeWidth = 14;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const segments = total === 0
        ? []
        : [
              { value: completed, color: '#10b981' }, // emerald
              { value: pending, color: '#f59e0b' },   // amber
              { value: notDone, color: '#0284c7' },   // sky
              { value: overdue, color: '#f43f5e' },   // rose
          ];

    let strokeDashoffsetAccumulator = 0;

    return (
        <div className="flex flex-col items-center justify-center p-2 space-y-4">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        className="text-muted opacity-20"
                        strokeWidth={strokeWidth}
                    />
                    {!loading &&
                        total > 0 &&
                        segments.map((seg, i) => {
                            const strokeDasharray = (seg.value / total) * circumference;
                            const currentOffset = strokeDashoffsetAccumulator;
                            strokeDashoffsetAccumulator -= strokeDasharray;
                            return (
                                <circle
                                    key={i}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${strokeDasharray} ${circumference - strokeDasharray}`}
                                    strokeDashoffset={currentOffset}
                                    className="transition-all duration-700 ease-out"
                                    strokeLinecap="round"
                                />
                            );
                        })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        <TrendingUp size={12} />
                        <span>{completionRate}%</span>
                    </div>
                    <span className="text-3xl font-black text-foreground tracking-tight tabular-nums mt-0.5">
                        {loading ? '—' : total}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Total Tasks
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs w-full pt-2 border-t">
                <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-bold text-foreground ml-auto">{completed}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-muted-foreground">Pending:</span>
                    <span className="font-bold text-foreground ml-auto">{pending}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-sky-500 shrink-0" />
                    <span className="text-muted-foreground">Not Done:</span>
                    <span className="font-bold text-foreground ml-auto">{notDone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-muted-foreground">Overdue:</span>
                    <span className="font-bold text-foreground ml-auto">{overdue}</span>
                </div>
            </div>
        </div>
    );
}


export default function ChecklistDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { checklistTasks, delegationTasks, loading } = useChecklistData();
    const isSuperAdmin = isChecklistSuperAdmin(user) || user?.administrate === true;
    const hasApprovalAccess = hasPageAccess(user, undefined, 'VIEW', 'checklistApproval');
    const canViewApprovalCard = isSuperAdmin || (isChecklistAdmin(user) && hasApprovalAccess);

    const [mode, setMode] = useState<DashboardMode>('all');
    const [datePreset, setDatePreset] = useState<DatePreset>('mtd');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [doerFilter, setDoerFilter] = useState<string>('all');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);

    // Collect distinct project names
    const projectOptions = useMemo(() => {
        const set = new Set<string>();
        [...checklistTasks, ...delegationTasks].forEach((t) => {
            if (t.firm_name) set.add(t.firm_name);
        });
        return Array.from(set).sort();
    }, [checklistTasks, delegationTasks]);

    // Collect distinct doer names
    const doerOptions = useMemo(() => {
        const set = new Set<string>();
        [...checklistTasks, ...delegationTasks].forEach((t) => {
            if (t.doer_name) set.add(t.doer_name);
        });
        return Array.from(set).sort();
    }, [checklistTasks, delegationTasks]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (datePreset !== 'mtd') count++;
        if (projectFilter !== 'all') count++;
        if (doerFilter !== 'all') count++;
        return count;
    }, [datePreset, projectFilter, doerFilter]);

    function resetAllFilters() {
        setDatePreset('mtd');
        setProjectFilter('all');
        setDoerFilter('all');
    }

    const filteredRawTasks = useMemo(() => {
        let tasks: any[] = [];
        if (mode === 'all' || mode === 'checklist') {
            tasks = tasks.concat(checklistTasks.map((t) => ({ ...t, _kind: 'checklist' })));
        }
        if (mode === 'all' || mode === 'delegation') {
            tasks = tasks.concat(delegationTasks.map((t) => ({ ...t, _kind: 'delegation' })));
        }

        // Date Range Preset Filter
        if (datePreset !== 'all') {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

            tasks = tasks.filter((t) => {
                const pDate = new Date(t.planned_date || t.task_start_date || t.created_at || now);

                if (datePreset === 'mtd') {
                    // Month-to-Date: 1st of current month up to TODAY
                    return pDate.getTime() >= firstOfCurrentMonth.getTime() && pDate.getTime() <= todayEnd.getTime();
                }
                if (datePreset === 'full_month') {
                    // Full Current Month: 1st of month to month end
                    return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
                }
                if (datePreset === 'today') {
                    return pDate.getTime() >= todayStart.getTime() && pDate.getTime() <= todayEnd.getTime();
                }
                if (datePreset === '7days') {
                    const diffDays = (todayStart.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
                    return diffDays >= 0 && diffDays <= 7;
                }
                return true;
            });
        }

        // Project Filter
        if (projectFilter !== 'all') {
            tasks = tasks.filter((t) => (t.firm_name || '') === projectFilter);
        }

        // Doer Filter
        if (doerFilter !== 'all') {
            tasks = tasks.filter((t) => (t.doer_name || '') === doerFilter);
        }

        return tasks;
    }, [checklistTasks, delegationTasks, mode, datePreset, projectFilter, doerFilter]);

    const metrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let completed = 0, completedChecklist = 0, completedDelegation = 0;
        let pending = 0, pendingChecklist = 0, pendingDelegation = 0;
        let notDone = 0, notDoneChecklist = 0, notDoneDelegation = 0;
        let overdue = 0, overdueChecklist = 0, overdueDelegation = 0;

        let totalChecklist = 0;
        let totalDelegation = 0;

        filteredRawTasks.forEach((t) => {
            const isCk = t._kind === 'checklist';
            if (isCk) totalChecklist++; else totalDelegation++;

            const status = (t.status || '').toLowerCase();
            if (status === 'done' || status === 'approved') {
                completed++;
                if (isCk) completedChecklist++; else completedDelegation++;
            } else if (status === 'not_done' || status === 'rejected') {
                notDone++;
                if (isCk) notDoneChecklist++; else notDoneDelegation++;
            } else {
                const planned = toDateOnly(t.planned_date || t.task_start_date);
                const bucket = getTimeBucket(planned, today);
                if (bucket === 'Overdue') {
                    overdue++;
                    if (isCk) overdueChecklist++; else overdueDelegation++;
                } else {
                    pending++;
                    if (isCk) pendingChecklist++; else pendingDelegation++;
                }
            }
        });

        const total = filteredRawTasks.length;
        const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

        return {
            total, totalChecklist, totalDelegation,
            completed, completedChecklist, completedDelegation,
            pending, pendingChecklist, pendingDelegation,
            notDone, notDoneChecklist, notDoneDelegation,
            overdue, overdueChecklist, overdueDelegation,
            completionRate,
        };
    }, [filteredRawTasks]);

    // Doer performance breakdown table
    const doerStats = useMemo(() => {
        const map = new Map<string, {
            name: string;
            total: number;
            completed: number;
            pending: number;
            onTime: number;
        }>();

        filteredRawTasks.forEach((t) => {
            const doerName = String(t.doer_name || t.user_name || 'Unassigned').trim();
            if (!map.has(doerName)) {
                map.set(doerName, { name: doerName, total: 0, completed: 0, pending: 0, onTime: 0 });
            }
            const stat = map.get(doerName)!;
            stat.total++;

            const status = (t.status || '').toLowerCase();
            if (status === 'done' || status === 'approved') {
                stat.completed++;
                const planned = toDateOnly(t.planned_date || t.task_start_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (getTimeBucket(planned, today) !== 'Overdue') {
                    stat.onTime++;
                }
            } else {
                stat.pending++;
            }
        });

        let list = Array.from(map.values()).sort((a, b) => b.completed - a.completed);

        if (userSearch.trim()) {
            const q = userSearch.toLowerCase().trim();
            list = list.filter((u) => u.name.toLowerCase().includes(q));
        }

        return list;
    }, [filteredRawTasks, userSearch]);

    const pendingApprovalCount = useMemo(() => {
        const checklistDone = checklistTasks.filter((t) => t.status === 'done').length;
        const delegationAwaiting = delegationTasks.filter((t) => t.status === 'done' || t.status === 'extend').length;
        return checklistDone + delegationAwaiting;
    }, [checklistTasks, delegationTasks]);

    // GSAP Stagger Entrance Animation for Metric Cards
    useGSAP(
        () => {
            if (containerRef.current) {
                gsap.fromTo(
                    '.dashboard-card',
                    { opacity: 0, y: 20, scale: 0.96 },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.45,
                        stagger: 0.08,
                        ease: 'back.out(1.4)',
                    }
                );
            }
        },
        { scope: containerRef, dependencies: [mode, datePreset, projectFilter, doerFilter] }
    );

    return (
        <div ref={containerRef} className="space-y-6">
            {/* Header Card with Mode Switcher & Expandable Filters Button */}
            <div className="bg-card p-4 rounded-2xl border shadow-2xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Heading
                        heading="Checklist & Delegation Dashboard"
                        subtext="Real-time operational compliance, doer performance metrics, and task analytics"
                    />

                    {/* TOOLBAR CONTROLS */}
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-auto">
                            <TabsList className="h-9 bg-muted/60 p-1 rounded-xl">
                                <TabsTrigger value="all" className="text-xs px-3 py-1 rounded-lg font-semibold data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                                    All Tasks
                                </TabsTrigger>
                                <TabsTrigger value="checklist" className="text-xs px-3 py-1 rounded-lg font-semibold data-[state=active]:bg-sky-600 data-[state=active]:text-white">
                                    Checklists
                                </TabsTrigger>
                                <TabsTrigger value="delegation" className="text-xs px-3 py-1 rounded-lg font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                    Delegations
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Filters Toggle Button */}
                        <Button
                            variant={showFilterPanel || activeFilterCount > 0 ? 'default' : 'outline'}
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className={cn(
                                'h-9 text-xs font-semibold rounded-xl gap-2 transition-all',
                                showFilterPanel || activeFilterCount > 0
                                    ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm'
                                    : 'bg-muted/40 border-muted hover:bg-muted/80'
                            )}
                        >
                            <Filter size={13} />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="size-4 rounded-full bg-white text-violet-700 font-extrabold text-[10px] flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown size={13} className={cn('transition-transform duration-200', showFilterPanel ? 'rotate-180' : '')} />
                        </Button>
                    </div>
                </div>

                {/* Expandable Horizontal Filter Panel */}
                {showFilterPanel && (
                    <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-in fade-in-50 slide-in-from-top-2 duration-250">
                        {/* 1. Date Range Selection */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Calendar size={11} className="text-violet-600" /> Date Range
                            </label>
                            <Select value={datePreset} onValueChange={(v: any) => setDatePreset(v)}>
                                <SelectTrigger className="h-8.5 text-xs bg-muted/30 border-muted/80 rounded-xl font-medium">
                                    <SelectValue placeholder="Select Date Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mtd" className="text-xs font-semibold">Month-to-Date (1st to Today)</SelectItem>
                                    <SelectItem value="full_month" className="text-xs font-medium">Full Current Month (1st to End)</SelectItem>
                                    <SelectItem value="today" className="text-xs font-medium">Today Only</SelectItem>
                                    <SelectItem value="7days" className="text-xs font-medium">Last 7 Days</SelectItem>
                                    <SelectItem value="all" className="text-xs font-medium">All Time</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Project Dropdown Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Briefcase size={11} className="text-purple-600" /> Project / Firm
                            </label>
                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                                <SelectTrigger className="h-8.5 text-xs bg-muted/30 border-muted/80 rounded-xl font-medium">
                                    <SelectValue placeholder="All Projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs font-medium">All Projects</SelectItem>
                                    {projectOptions.map((name) => (
                                        <SelectItem key={name} value={name} className="text-xs font-medium">{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Doer Name Dropdown Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <UserIcon size={11} className="text-amber-600" /> Doer Name
                            </label>
                            <Select value={doerFilter} onValueChange={setDoerFilter}>
                                <SelectTrigger className="h-8.5 text-xs bg-muted/30 border-muted/80 rounded-xl font-medium">
                                    <SelectValue placeholder="All Doers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs font-medium">All Doer Names</SelectItem>
                                    {doerOptions.map((name) => (
                                        <SelectItem key={name} value={name} className="text-xs font-medium">{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 4. Reset Filters Action */}
                        <div className="flex items-end justify-between sm:justify-end gap-2">
                            {activeFilterCount > 0 ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetAllFilters}
                                    className="h-8.5 text-xs text-muted-foreground hover:text-foreground gap-1 px-3 rounded-xl border border-dashed"
                                >
                                    <RotateCcw size={12} /> Reset All ({activeFilterCount})
                                </Button>
                            ) : (
                                <span className="text-[11px] text-muted-foreground italic self-center">No active filters</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 5-Column Dynamic Metric Cards with Mode-Aware Navigation Popover */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Tasks */}
                <MetricCard
                    title="Total Tasks"
                    value={metrics.total}
                    subtitle={`Aggregate tasks (${metrics.completionRate}% Done)`}
                    icon={ListTodo}
                    textColor="text-blue-600 dark:text-blue-400"
                    iconGradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    iconShadow="shadow-blue-500/25"
                    cardBg="bg-gradient-to-br from-blue-50/70 via-indigo-50/20 to-white dark:from-blue-950/20 dark:to-slate-900/20"
                    borderClass="border-blue-100/90 dark:border-blue-900/30"
                    dotColor="text-blue-500"
                    mode={mode}
                    checklistCount={metrics.totalChecklist}
                    delegationCount={metrics.totalDelegation}
                    onNavigate={(p) => navigate(p)}
                />

                {/* 2. Completed */}
                <MetricCard
                    title="Completed"
                    value={metrics.completed}
                    subtitle={`${metrics.completionRate}% completion rate`}
                    icon={CheckCircle2}
                    textColor="text-emerald-600 dark:text-emerald-400"
                    iconGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                    iconShadow="shadow-emerald-500/25"
                    cardBg="bg-gradient-to-br from-emerald-50/70 via-teal-50/20 to-white dark:from-emerald-950/20 dark:to-slate-900/20"
                    borderClass="border-emerald-100/90 dark:border-emerald-900/30"
                    dotColor="text-emerald-500"
                    mode={mode}
                    checklistCount={metrics.completedChecklist}
                    delegationCount={metrics.completedDelegation}
                    onNavigate={(p) => navigate(p)}
                />

                {/* 3. Pending */}
                <MetricCard
                    title="Pending"
                    value={metrics.pending}
                    subtitle="Awaiting fulfillment on time"
                    icon={Clock}
                    textColor="text-amber-600 dark:text-amber-400"
                    iconGradient="bg-gradient-to-br from-amber-500 to-orange-500"
                    iconShadow="shadow-amber-500/25"
                    cardBg="bg-gradient-to-br from-amber-50/70 via-orange-50/20 to-white dark:from-amber-950/20 dark:to-slate-900/20"
                    borderClass="border-amber-100/90 dark:border-amber-900/30"
                    dotColor="text-amber-500"
                    mode={mode}
                    checklistCount={metrics.pendingChecklist}
                    delegationCount={metrics.pendingDelegation}
                    onNavigate={(p) => navigate(p)}
                />

                {/* 4. Not Done */}
                <MetricCard
                    title="Not Done"
                    value={metrics.notDone}
                    subtitle="Skipped / Exception tasks"
                    icon={XCircle}
                    textColor="text-sky-600 dark:text-sky-400"
                    iconGradient="bg-gradient-to-br from-sky-500 to-blue-600"
                    iconShadow="shadow-sky-500/25"
                    cardBg="bg-gradient-to-br from-sky-50/70 via-blue-50/20 to-white dark:from-sky-950/20 dark:to-slate-900/20"
                    borderClass="border-sky-100/90 dark:border-sky-900/30"
                    dotColor="text-sky-500"
                    mode={mode}
                    checklistCount={metrics.notDoneChecklist}
                    delegationCount={metrics.notDoneDelegation}
                    onNavigate={(p) => navigate(p)}
                />

                {/* 5. Overdue */}
                <MetricCard
                    title="Overdue"
                    value={metrics.overdue}
                    subtitle="Past target deadline"
                    icon={AlertTriangle}
                    textColor="text-rose-600 dark:text-rose-400"
                    iconGradient="bg-gradient-to-br from-rose-500 to-red-600"
                    iconShadow="shadow-rose-500/25"
                    cardBg="bg-gradient-to-br from-rose-50/70 via-red-50/20 to-white dark:from-rose-950/20 dark:to-slate-900/20"
                    borderClass="border-rose-100/90 dark:border-rose-900/30"
                    dotColor="text-rose-500"
                    mode={mode}
                    checklistCount={metrics.overdueChecklist}
                    delegationCount={metrics.overdueDelegation}
                    onNavigate={(p) => navigate(p)}
                />
            </div>

            {/* Middle Row: Multi-Segment Radial Chart & Pending Approvals Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <Card className="lg:col-span-5 flex flex-col justify-between shadow-2xs rounded-2xl">
                    <CardHeader className="pb-2 border-b">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <ListTodo className="size-4 text-violet-600" />
                            Overall Task Completion Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 flex items-center justify-center">
                        <MultiSegmentRadialRing
                            completed={metrics.completed}
                            pending={metrics.pending}
                            notDone={metrics.notDone}
                            overdue={metrics.overdue}
                            loading={loading}
                        />
                    </CardContent>
                </Card>

                <div className="lg:col-span-7 flex flex-col gap-4">
                    {canViewApprovalCard && (
                        <Card className="border-l-4 border-l-purple-600 overflow-hidden shadow-2xs bg-card rounded-2xl">
                            <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />
                            <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                        <ShieldCheck className="size-5 text-purple-600" />
                                        Pending Administrative Approvals
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Submissions and target date extension requests awaiting your review
                                    </p>
                                </div>
                                <span className="text-4xl font-black text-purple-600 tabular-nums">
                                    {loading ? '—' : pendingApprovalCount}
                                </span>
                            </CardHeader>
                            <CardContent className="pb-4 pt-2">
                                <Button
                                    onClick={() => navigate('/checklist/approval')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs h-9 px-4 rounded-xl"
                                >
                                    Review Pending Submissions
                                    <ArrowRight className="size-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick Access Action Bar */}
                    <Card className="shadow-2xs p-4 flex-1 flex flex-col justify-center space-y-3 bg-muted/20 border-dashed rounded-2xl">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Quick System Actions</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <Button
                                variant="outline"
                                className="h-10 text-xs justify-start gap-2 bg-card hover:bg-sky-50 hover:text-sky-600 border-sky-200 rounded-xl"
                                onClick={() => navigate('/checklist/quick-task')}
                            >
                                <ListTodo size={15} className="text-sky-600" />
                                Quick Task
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 text-xs justify-start gap-2 bg-card hover:bg-emerald-50 hover:text-emerald-600 border-emerald-200 rounded-xl"
                                onClick={() => navigate('/checklist/assign')}
                            >
                                <Clock size={15} className="text-emerald-600" />
                                Assign Task
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 text-xs justify-start gap-2 bg-card hover:bg-purple-50 hover:text-purple-600 border-purple-200 col-span-2 sm:col-span-1 rounded-xl"
                                onClick={() => navigate('/checklist/submit/delegation')}
                            >
                                <CheckCircle2 size={15} className="text-purple-600" />
                                My Task Inbox
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Bottom Section: User Performance Table */}
            <Card className="shadow-2xs rounded-2xl">
                <CardHeader className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <UserIcon className="size-4 text-violet-600" />
                            Employee Performance & Compliance Leaderboard
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Task completion rates, on-time SLA percentages, and doer workloads
                        </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search doer by name..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="pl-9 h-9 text-xs rounded-xl"
                        />
                    </div>
                </CardHeader>
                <CardContent className="hidden md:block p-0 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-muted/40 text-muted-foreground border-b text-left">
                                <th className="py-2.5 px-4 font-bold w-12 text-center">Rank</th>
                                <th className="py-2.5 px-4 font-bold">Employee / Doer</th>
                                <th className="py-2.5 px-4 font-bold text-center">Total Tasks</th>
                                <th className="py-2.5 px-4 font-bold text-center">Completed</th>
                                <th className="py-2.5 px-4 font-bold text-center">Pending</th>
                                <th className="py-2.5 px-4 font-bold text-right">Completion Rate</th>
                                <th className="py-2.5 px-4 font-bold text-right">On-Time SLA %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {doerStats.length > 0 ? (
                                doerStats.map((doer, idx) => {
                                    const rate = doer.total > 0 ? Math.round((doer.completed / doer.total) * 100) : 0;
                                    const slaRate = doer.completed > 0 ? Math.round((doer.onTime / doer.completed) * 100) : 0;

                                    return (
                                        <tr key={doer.name} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4 text-center font-bold text-muted-foreground">
                                                #{idx + 1}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                                                <div className="size-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-xs">
                                                    {doer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span>{doer.name}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold">{doer.total}</td>
                                            <td className="py-3 px-4 text-center text-emerald-600 font-bold">{doer.completed}</td>
                                            <td className="py-3 px-4 text-center text-amber-600 font-bold">{doer.pending}</td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-bold text-foreground">{rate}%</span>
                                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-violet-600">
                                                {slaRate}%
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                                        No doer performance records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>

                {/* MOBILE CARD LIST - one card per employee, replaces the leaderboard table below md */}
                <CardContent className="md:hidden p-3 space-y-3">
                    {doerStats.length > 0 ? (
                        doerStats.map((doer, idx) => {
                            const rate = doer.total > 0 ? Math.round((doer.completed / doer.total) * 100) : 0;
                            const slaRate = doer.completed > 0 ? Math.round((doer.onTime / doer.completed) * 100) : 0;

                            return (
                                <TaskCard
                                    key={doer.name}
                                    idChip={`#${idx + 1}`}
                                    title={doer.name}
                                    statusBadge={<span className="font-bold text-violet-600 text-xs">{rate}% Done</span>}
                                    meta={[
                                        { icon: <UserIcon size={12} />, label: 'Total', value: doer.total },
                                        { icon: <CheckCircle2 size={12} />, label: 'Completed', value: <span className="text-emerald-600 font-bold">{doer.completed}</span> },
                                        { icon: <Clock size={12} />, label: 'Pending', value: <span className="text-amber-600 font-bold">{doer.pending}</span> },
                                        { icon: <ShieldCheck size={12} />, label: 'On-Time SLA', value: `${slaRate}%` },
                                    ]}
                                />
                            );
                        })
                    ) : (
                        <p className="py-8 text-center text-xs text-muted-foreground italic">No doer performance records found</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
