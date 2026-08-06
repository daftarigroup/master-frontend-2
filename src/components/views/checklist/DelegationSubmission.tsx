import { useMemo, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    CheckCircle2,
    ImagePlus,
    Mic,
    TimerReset,
    ClipboardCheck,
    Paperclip,
    Inbox,
    Send,
    Search,
    Clock,
    User,
    Calendar,
    Briefcase,
    Filter,
    Copy,
    Check,
    UserCheck,
    Eye,
    Sparkles,
    CalendarDays,
    Loader2,
    MessageSquare,
    Camera,
    Trash2,
    AlertCircle,
} from 'lucide-react';
import Heading from '@/components/element/Heading';
import FilterToolbar from '@/components/element/FilterToolbar';
import TaskCard from '@/components/element/TaskCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MediaPreviewDialog from '@/components/element/MediaPreviewDialog';
import { uploadFile } from '@/lib/fetchers';
import { toDateOnly, getTimeBucket } from '@/lib/checklistBuckets';
import { useChecklistData } from '@/context/ChecklistContext';
import { submitDelegationTask, type DelegationTaskRow } from '@/services/delegationTaskService';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const BATCH_SIZE = 15;

/** Custom Dropzone File Picker Component for clean file uploads */
function CustomFilePicker({
    label,
    icon: Icon,
    file,
    accept,
    onFileSelect,
    onFileRemove,
    colorTheme = 'sky',
}: {
    label: string;
    icon: any;
    file: File | null;
    accept: string;
    onFileSelect: (file: File | null) => void;
    onFileRemove: () => void;
    colorTheme?: 'sky' | 'purple';
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                    <Icon size={14} className={colorTheme === 'sky' ? 'text-sky-600' : 'text-purple-600'} />
                    {label}
                </span>
                {file && (
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Selected
                    </span>
                )}
            </div>

            <input
                type="file"
                ref={inputRef}
                accept={accept}
                onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
                className="hidden"
            />

            {!file ? (
                <div
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        'border-2 border-dashed rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group',
                        colorTheme === 'sky'
                            ? 'border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-100/60 dark:hover:bg-sky-900/40 hover:border-sky-400'
                            : 'border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 hover:border-purple-400'
                    )}
                >
                    <div
                        className={cn(
                            'p-2 rounded-xl text-white shadow-xs group-hover:scale-110 transition-transform duration-200',
                            colorTheme === 'sky' ? 'bg-sky-500' : 'bg-purple-500'
                        )}
                    >
                        <Icon size={16} />
                    </div>
                    <span className="text-xs font-bold text-foreground mt-2">Click to Upload</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                        {accept.includes('image') ? 'PNG, JPG or WebP' : 'MP3, WAV or AAC'}
                    </span>
                </div>
            ) : (
                <div className="border rounded-2xl p-2.5 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 transition-all">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
                            <Check size={14} />
                        </div>
                        <div className="truncate text-left">
                            <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onFileRemove}
                        className="size-7 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                        title="Remove file"
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function DelegationSubmission() {
    const { user } = useAuth();
    const { delegationTasks, loading, refresh } = useChecklistData();

    const [tabView, setTabView] = useState<'inbox' | 'outbox'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'completed' | 'extended'>('all');
    const [dateHorizon, setDateHorizon] = useState<'today_plus_1' | 'all'>('today_plus_1');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Batch infinite scroll state
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Modal state for delegation task completion or extension
    const [activeModalTask, setActiveModalTask] = useState<DelegationTaskRow | null>(null);
    const [modalMode, setModalMode] = useState<'done' | 'extend' | null>(null);
    const [remark, setRemark] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [extendDate, setExtendDate] = useState('');
    const [extendReason, setExtendReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Batch submitting state
    const [batchSubmitting, setBatchSubmitting] = useState(false);

    // GSAP Container Ref
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter tasks based on Tab (Inbox/Outbox), Date Horizon (Today + 1), Status, and Search
    const filteredTasks = useMemo(() => {
        let tasks = delegationTasks;

        if (tabView === 'inbox') {
            tasks = tasks.filter(
                (t) => String(t.doer_id) === String(user?.id) || String(t.doer_name).toLowerCase() === String(user?.name).toLowerCase()
            );
        } else {
            tasks = tasks.filter(
                (t) => String(t.given_by_id) === String(user?.id) || String(t.given_by_name).toLowerCase() === String(user?.name).toLowerCase()
            );
        }

        // Date Horizon Filter: Show all Today/Overdue tasks, plus AT MOST 1 next upcoming task per recurring task
        if (dateHorizon === 'today_plus_1') {
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const todayAndOverdue: typeof tasks = [];
            const upcomingMap = new Map<string, (typeof tasks)[0]>();

            // Sort by date ascending to ensure we encounter the earliest upcoming date first
            const sortedTasks = [...tasks].sort((a, b) => {
                const dA = new Date(a.planned_date || a.task_start_date || a.created_at || 0).getTime();
                const dB = new Date(b.planned_date || b.task_start_date || b.created_at || 0).getTime();
                return dA - dB;
            });

            for (const t of sortedTasks) {
                const pDate = new Date(t.planned_date || t.task_start_date || t.created_at || Date.now());
                if (pDate.getTime() <= todayEnd.getTime()) {
                    todayAndOverdue.push(t);
                } else {
                    const key = `${t.firm_id || ''}_${t.doer_id || ''}_${(t.task_description || '').toLowerCase().trim()}`;
                    if (!upcomingMap.has(key)) {
                        upcomingMap.set(key, t);
                    }
                }
            }

            tasks = [...todayAndOverdue, ...Array.from(upcomingMap.values())].sort((a, b) => {
                const dA = new Date(a.planned_date || a.task_start_date || a.created_at || 0).getTime();
                const dB = new Date(b.planned_date || b.task_start_date || b.created_at || 0).getTime();
                return dA - dB;
            });
        }

        if (statusFilter !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            tasks = tasks.filter((t) => {
                const s = (t.status || '').toLowerCase();
                if (statusFilter === 'completed') return s === 'done' || s === 'approved';
                if (statusFilter === 'extended') return s === 'extend' || s === 'extended';
                const planned = toDateOnly(t.planned_date || t.task_start_date);
                const isOverdue = getTimeBucket(planned, today) === 'Overdue';
                if (statusFilter === 'overdue') return isOverdue && s !== 'done' && s !== 'approved';
                if (statusFilter === 'pending') return s === 'pending';
                return true;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            tasks = tasks.filter(
                (t) =>
                    (t.task_description || '').toLowerCase().includes(q) ||
                    (t.firm_name || '').toLowerCase().includes(q) ||
                    (t.doer_name || '').toLowerCase().includes(q) ||
                    (t.given_by_name || '').toLowerCase().includes(q) ||
                    `dl-${t.task_id}`.includes(q)
            );
        }

        return tasks;
    }, [delegationTasks, tabView, dateHorizon, statusFilter, searchQuery, user]);

    // Reset pagination window when filters change
    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [tabView, statusFilter, dateHorizon, searchQuery]);

    // Paginated subset of tasks currently rendered
    const paginatedTasks = useMemo(() => {
        return filteredTasks.slice(0, visibleCount);
    }, [filteredTasks, visibleCount]);

    // Infinite Scroll IntersectionObserver
    useEffect(() => {
        if (!loadMoreRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < filteredTasks.length) {
                    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredTasks.length));
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [visibleCount, filteredTasks.length]);

    // GSAP Stagger Entrance Animation for Table Rows
    useGSAP(
        () => {
            if (containerRef.current && paginatedTasks.length > 0) {
                gsap.fromTo(
                    '.delegation-row',
                    { opacity: 0, y: 10 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.3,
                        stagger: 0.03,
                        ease: 'power2.out',
                    }
                );
            }
        },
        { scope: containerRef, dependencies: [paginatedTasks.length, tabView, statusFilter, dateHorizon, searchQuery] }
    );

    // Copy Task ID
    function handleCopyId(taskId: number) {
        navigator.clipboard.writeText(`DL-${taskId}`);
        setCopiedId(taskId);
        toast.success(`Copied DL-${taskId} to clipboard`);
        setTimeout(() => setCopiedId(null), 2000);
    }

    // Checkbox Toggles
    function toggleSelectRow(id: number) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }

    function toggleSelectAll() {
        if (selectedIds.length === paginatedTasks.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedTasks.map((t) => t.task_id));
        }
    }

    // Open Modal Handlers
    function openDoneModal(task: DelegationTaskRow) {
        setActiveModalTask(task);
        setModalMode('done');
        setRemark(task.remark || '');
        setImageFile(null);
        setAudioFile(null);
    }

    function openExtendModal(task: DelegationTaskRow) {
        setActiveModalTask(task);
        setModalMode('extend');
        setExtendReason('');
        const minDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);
        setExtendDate(minDate);
    }

    function resetAndCloseModal() {
        setActiveModalTask(null);
        setModalMode(null);
        setRemark('');
        setImageFile(null);
        setAudioFile(null);
        setExtendDate('');
        setExtendReason('');
    }

    // Single Submit Done
    async function handleDoneSubmit() {
        if (!activeModalTask) return;
        if (activeModalTask.require_attachment && !imageFile) {
            toast.error('This delegation task requires a proof photo attachment');
            return;
        }

        setSubmitting(true);
        try {
            const [imageUrl, audioUrl] = await Promise.all([
                imageFile ? uploadFile({ file: imageFile, folderId: 'delegation', subFolder: 'proof-images' }) : Promise.resolve(null),
                audioFile ? uploadFile({ file: audioFile, folderId: 'delegation', subFolder: 'proof-audio' }) : Promise.resolve(null),
            ]);

            await submitDelegationTask(activeModalTask.task_id, {
                status: 'done',
                image: imageUrl,
                audio_url: audioUrl,
                remark: remark || null,
            });

            toast.success(`Delegation task DL-${activeModalTask.task_id} completed successfully!`);
            resetAndCloseModal();
            refresh();
        } catch (error) {
            console.error('Error completing delegation task:', error);
            toast.error('Failed to submit completion');
        } finally {
            setSubmitting(false);
        }
    }

    // Single Submit Extend Request
    async function handleExtendSubmit() {
        if (!activeModalTask) return;
        if (!extendDate) {
            toast.error('Please select a target extension date');
            return;
        }
        if (!extendReason.trim()) {
            toast.error('Please provide a reason for the extension request');
            return;
        }

        setSubmitting(true);
        try {
            await submitDelegationTask(activeModalTask.task_id, {
                status: 'extend',
                next_extend_date: new Date(extendDate).toISOString(),
                reason: extendReason,
            });

            toast.success(`Extension request submitted for task DL-${activeModalTask.task_id}`);
            resetAndCloseModal();
            refresh();
        } catch (error) {
            console.error('Error requesting target date extension:', error);
            toast.error('Failed to submit extension request');
        } finally {
            setSubmitting(false);
        }
    }

    // Batch Complete Selected Tasks
    async function handleBatchComplete() {
        if (selectedIds.length === 0) return;
        setBatchSubmitting(true);
        try {
            for (const id of selectedIds) {
                await submitDelegationTask(id, {
                    status: 'done',
                    remark: 'Batch completed via Delegation Submission Inbox',
                });
            }
            toast.success(`Successfully completed ${selectedIds.length} delegation tasks!`);
            setSelectedIds([]);
            refresh();
        } catch (error) {
            console.error('Batch complete error:', error);
            toast.error('Failed to complete selected delegation tasks');
        } finally {
            setBatchSubmitting(false);
        }
    }

    return (
        <div ref={containerRef} className="space-y-5">
            {/* Top Header Section */}
            <Heading
                heading="One-Time Task Delegation Inbox"
                subtext="View assigned tasks, update execution status, upload proof, or request target date extensions"
            >
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 rounded-xl shadow-md text-white">
                    <ClipboardCheck size={24} />
                </div>
            </Heading>

            {/* Sub-Header Toolbar: Inbox/Outbox Tabs, Date Horizon, Filters & Search */}
            <FilterToolbar
                activeFilterCount={(dateHorizon !== 'today_plus_1' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
                extra={
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Inbox / Outbox Tabs */}
                        <Tabs value={tabView} onValueChange={(v) => setTabView(v as any)} className="w-auto">
                            <TabsList className="h-9 bg-muted/60 p-1 rounded-xl">
                                <TabsTrigger value="inbox" className="text-xs px-3 py-1 font-bold rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                    <Inbox size={13} className="mr-1.5" />
                                    My Inbox (Assigned To Me)
                                </TabsTrigger>
                                <TabsTrigger value="outbox" className="text-xs px-3 py-1 font-bold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                    <Send size={13} className="mr-1.5" />
                                    Assigned Out (Given By Me)
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {selectedIds.length > 0 && (
                            <div className="flex items-center justify-between gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 p-2 rounded-xl">
                                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
                                    {selectedIds.length} delegation task(s) selected
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleBatchComplete}
                                    disabled={batchSubmitting}
                                    className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-2xs"
                                >
                                    <CheckCircle2 size={14} />
                                    {batchSubmitting ? 'Completing...' : 'Mark Selected Completed'}
                                </Button>
                            </div>
                        )}
                    </div>
                }
                search={
                    <div className="relative md:min-w-[200px] md:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search task ID, project, doer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>
                }
                filters={
                    <>
                        {/* Date Horizon Window Switcher */}
                        <Select value={dateHorizon} onValueChange={(v) => setDateHorizon(v as any)}>
                            <SelectTrigger className="w-full md:w-[185px] h-9 text-xs bg-muted/30 border-muted">
                                <CalendarDays size={13} className="mr-1.5 text-purple-600" />
                                <SelectValue placeholder="Date Window" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today_plus_1" className="text-xs font-semibold">
                                    Today & Upcoming
                                </SelectItem>
                                <SelectItem value="all" className="text-xs">
                                    All Delegation Dates
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger className="w-full md:w-[140px] h-9 text-xs">
                                <Filter size={13} className="mr-1.5 text-muted-foreground" />
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                                <SelectItem value="overdue" className="text-xs">Overdue</SelectItem>
                                <SelectItem value="completed" className="text-xs font-semibold text-emerald-600">Completed</SelectItem>
                                <SelectItem value="extended" className="text-xs font-semibold text-amber-600">Extended</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
            />

            {/* MAIN DELEGATION TABLE - 13 Exact Columns (desktop) */}
            <div className="hidden md:block border rounded-xl bg-card shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-10 text-center">
                                    <Checkbox
                                        checked={paginatedTasks.length > 0 && selectedIds.length === paginatedTasks.length}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="w-28 text-center text-xs font-bold uppercase">Task Status</TableHead>
                                <TableHead className="w-24 text-xs font-bold uppercase">ID</TableHead>
                                <TableHead className="min-w-[220px] text-xs font-bold uppercase">Description</TableHead>
                                <TableHead className="w-32 text-xs font-bold uppercase">Project</TableHead>
                                <TableHead className="w-32 text-xs font-bold uppercase">Assigned By</TableHead>
                                <TableHead className="w-32 text-xs font-bold uppercase">Doer Name</TableHead>
                                <TableHead className="w-36 text-xs font-bold uppercase">Last Activity</TableHead>
                                <TableHead className="w-36 text-xs font-bold uppercase">Planned Date</TableHead>
                                <TableHead className="w-28 text-xs font-bold uppercase">Select Status</TableHead>
                                <TableHead className="w-36 text-xs font-bold uppercase">Next Target Date</TableHead>
                                <TableHead className="min-w-[150px] text-xs font-bold uppercase">Remarks</TableHead>
                                <TableHead className="w-24 text-center text-xs font-bold uppercase">Upload</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="h-32 text-center text-xs text-muted-foreground">
                                        Loading delegation tasks...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedTasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="h-32 text-center text-xs text-muted-foreground italic">
                                        No delegation tasks found for selected filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTasks.map((task) => {
                                    const isDone = (task.status || '').toLowerCase() === 'done' || (task.status || '').toLowerCase() === 'approved';
                                    const isExtend = (task.status || '').toLowerCase() === 'extend';
                                    const isSelected = selectedIds.includes(task.task_id);
                                    const taskChip = `DL-${task.task_id}`;

                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const planned = toDateOnly(task.planned_date || task.task_start_date);
                                    const timeBucket = getTimeBucket(planned, today);
                                    const isOverdue = timeBucket === 'Overdue' && !isDone;

                                    return (
                                        <TableRow
                                            key={task.task_id}
                                            className={`delegation-row transition-colors text-xs ${
                                                isSelected ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''
                                            } ${isDone ? 'opacity-75 bg-slate-50/40 dark:bg-slate-900/20' : ''}`}
                                        >
                                            {/* Column 1: Checkbox */}
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelectRow(task.task_id)}
                                                    aria-label={`Select task ${taskChip}`}
                                                />
                                            </TableCell>

                                            {/* Column 2: Task Status Action */}
                                            <TableCell className="text-center">
                                                {isDone ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                        <CheckCircle2 size={12} /> Done
                                                    </span>
                                                ) : isExtend ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                                        <TimerReset size={12} /> Ext. Awaited
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            size="icon"
                                                            onClick={() => openDoneModal(task)}
                                                            className="size-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs"
                                                            title="Complete Delegation Task"
                                                        >
                                                            <CheckCircle2 size={14} />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() => openExtendModal(task)}
                                                            className="size-7 border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40 rounded-lg"
                                                            title="Request Target Date Extension"
                                                        >
                                                            <TimerReset size={14} />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Column 3: ID */}
                                            <TableCell className="font-mono font-bold">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyId(task.task_id)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-extrabold text-[11px]"
                                                    title="Click to copy ID"
                                                >
                                                    {copiedId === task.task_id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="opacity-60" />}
                                                    <span>{taskChip}</span>
                                                </button>
                                            </TableCell>

                                            {/* Column 4: Description */}
                                            <TableCell className="font-medium text-foreground">
                                                {task.task_description}
                                            </TableCell>

                                            {/* Column 5: Project */}
                                            <TableCell className="text-muted-foreground font-semibold">
                                                {task.firm_name || '—'}
                                            </TableCell>

                                            {/* Column 6: Assigned By */}
                                            <TableCell className="text-muted-foreground">
                                                {task.given_by_name || 'Admin'}
                                            </TableCell>

                                            {/* Column 7: Doer Name */}
                                            <TableCell className="font-bold text-foreground">
                                                {task.doer_name || 'Unassigned'}
                                            </TableCell>

                                            {/* Column 8: Last Activity */}
                                            <TableCell className="text-muted-foreground text-[11px]">
                                                {task.submission_date
                                                    ? new Date(task.submission_date).toLocaleString('en-US', {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      })
                                                    : task.created_at
                                                    ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                    : '—'}
                                            </TableCell>

                                            {/* Column 9: Planned Date */}
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className={`font-semibold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                                        {task.planned_date
                                                            ? new Date(task.planned_date).toLocaleDateString('en-US', {
                                                                  month: 'short',
                                                                  day: 'numeric',
                                                                  year: 'numeric',
                                                              })
                                                            : '—'}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">Overdue</span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Column 10: Select Status */}
                                            <TableCell>
                                                <span
                                                    className={`capitalize font-extrabold text-[11px] px-2.5 py-0.5 rounded border ${
                                                        isDone
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                            : isExtend
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                                            : isOverdue
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                                    }`}
                                                >
                                                    {isOverdue ? 'overdue' : task.status || 'pending'}
                                                </span>
                                            </TableCell>

                                            {/* Column 11: Next Target Date */}
                                            <TableCell className="text-muted-foreground font-medium">
                                                {isExtend ? (
                                                    <span className="text-amber-600 font-bold flex items-center gap-1">
                                                        <TimerReset size={12} /> Pending Approval
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground opacity-60">—</span>
                                                )}
                                            </TableCell>

                                            {/* Column 12: Remarks */}
                                            <TableCell className="max-w-[180px] truncate text-muted-foreground italic">
                                                {task.remark ? task.remark : '—'}
                                            </TableCell>

                                            {/* Column 13: Upload */}
                                            <TableCell className="text-center">
                                                {task.instruction_attachment_url ? (
                                                    <MediaPreviewDialog
                                                        imageUrl={task.instruction_attachment_url}
                                                        title={`Instruction Attachment - ${taskChip}`}
                                                        trigger={
                                                            <Button variant="ghost" size="icon" className="size-7 text-violet-600 hover:bg-violet-50">
                                                                <Paperclip size={14} />
                                                            </Button>
                                                        }
                                                    />
                                                ) : task.image ? (
                                                    <MediaPreviewDialog
                                                        imageUrl={task.image}
                                                        title={`Proof Attachment - ${taskChip}`}
                                                        trigger={
                                                            <Button variant="ghost" size="icon" className="size-7 text-emerald-600 hover:bg-emerald-50">
                                                                <Eye size={14} />
                                                            </Button>
                                                        }
                                                    />
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDoneModal(task)}
                                                        className="size-7 text-muted-foreground hover:text-foreground"
                                                        title="Upload Proof"
                                                    >
                                                        <ImagePlus size={14} />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* MOBILE CARD LIST - one card per task, replaces the table below md */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <p className="py-10 text-center text-xs text-muted-foreground">Loading delegation tasks...</p>
                ) : paginatedTasks.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground italic">No delegation tasks found for selected filters.</p>
                ) : (
                    paginatedTasks.map((task) => {
                        const isDone = (task.status || '').toLowerCase() === 'done' || (task.status || '').toLowerCase() === 'approved';
                        const isExtend = (task.status || '').toLowerCase() === 'extend';
                        const isSelected = selectedIds.includes(task.task_id);
                        const taskChip = `DL-${task.task_id}`;

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const planned = toDateOnly(task.planned_date || task.task_start_date);
                        const timeBucket = getTimeBucket(planned, today);
                        const isOverdue = timeBucket === 'Overdue' && !isDone;

                        return (
                            <TaskCard
                                key={task.task_id}
                                idChip={taskChip}
                                onCopyId={() => handleCopyId(task.task_id)}
                                idCopied={copiedId === task.task_id}
                                selected={isSelected}
                                onToggleSelect={() => toggleSelectRow(task.task_id)}
                                muted={isDone}
                                title={task.task_description}
                                statusBadge={
                                    <span
                                        className={`capitalize font-extrabold text-[11px] px-2.5 py-0.5 rounded border ${
                                            isDone
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                : isExtend
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                                : isOverdue
                                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                        }`}
                                    >
                                        {isOverdue ? 'overdue' : task.status || 'pending'}
                                    </span>
                                }
                                meta={[
                                    { icon: <Briefcase size={12} />, label: 'Project', value: task.firm_name || '—' },
                                    { icon: <UserCheck size={12} />, label: 'Doer', value: task.doer_name || 'Unassigned' },
                                    { icon: <User size={12} />, label: 'By', value: task.given_by_name || 'Admin' },
                                    {
                                        icon: <Calendar size={12} />,
                                        label: 'Planned',
                                        value: (
                                            <span className={isOverdue ? 'text-rose-600 dark:text-rose-400' : ''}>
                                                {task.planned_date ? new Date(task.planned_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                            </span>
                                        ),
                                    },
                                    {
                                        icon: <Clock size={12} />,
                                        label: 'Last Activity',
                                        value: task.submission_date
                                            ? new Date(task.submission_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : task.created_at
                                            ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            : '—',
                                    },
                                    {
                                        icon: <TimerReset size={12} />,
                                        label: 'Next Target',
                                        value: isExtend ? <span className="text-amber-600 font-bold">Pending Approval</span> : '—',
                                    },
                                ]}
                                remark={task.remark ? `Remark: ${task.remark}` : undefined}
                                actions={
                                    <>
                                        {task.instruction_attachment_url ? (
                                            <MediaPreviewDialog
                                                imageUrl={task.instruction_attachment_url}
                                                title={`Instruction Attachment - ${taskChip}`}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2 text-violet-600">
                                                        <Paperclip size={12} /> Instructions
                                                    </Button>
                                                }
                                            />
                                        ) : task.image ? (
                                            <MediaPreviewDialog
                                                imageUrl={task.image}
                                                title={`Proof Attachment - ${taskChip}`}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2 text-emerald-600">
                                                        <Eye size={12} /> Proof
                                                    </Button>
                                                }
                                            />
                                        ) : null}

                                        {isDone ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                <CheckCircle2 size={12} /> Done
                                            </span>
                                        ) : isExtend ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                                <TimerReset size={12} /> Ext. Awaited
                                            </span>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openExtendModal(task)}
                                                    className="h-8 text-xs border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40 rounded-lg gap-1"
                                                >
                                                    <TimerReset size={13} /> Extend
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => openDoneModal(task)}
                                                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs gap-1"
                                                >
                                                    <CheckCircle2 size={13} /> Complete
                                                </Button>
                                            </>
                                        )}
                                    </>
                                }
                            />
                        );
                    })
                )}
            </div>

            {/* Batch Infinite Scroll Sentinel & Counter Footer (shared by table and card list) */}
            <div ref={loadMoreRef} className="p-3 text-center border bg-card rounded-xl shadow-2xs flex items-center justify-between px-4">
                <span className="text-xs text-muted-foreground font-medium">
                    Showing <strong className="text-foreground">{paginatedTasks.length}</strong> of{' '}
                    <strong className="text-foreground">{filteredTasks.length}</strong> tasks
                </span>

                {visibleCount < filteredTasks.length ? (
                    <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-bold">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Loading next batch...</span>
                    </div>
                ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                        All tasks loaded
                    </span>
                )}
            </div>

            {/* HIGH-PREMIUM DELEGATION COMPLETION MODAL */}
            <Dialog open={modalMode === 'done'} onOpenChange={(v) => !v && resetAndCloseModal()}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border shadow-2xl bg-card text-left">
                    {/* Header Banner */}
                    <DialogHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 p-5 border-b flex flex-row items-center justify-between space-y-0 text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2.5 rounded-2xl shadow-md shadow-emerald-500/25 shrink-0">
                                <CheckCircle2 size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                        {activeModalTask ? `DL-${activeModalTask.task_id}` : 'Task'}
                                    </span>
                                    <span className="text-xs font-semibold text-muted-foreground">Delegation Completion</span>
                                </div>
                                <DialogTitle className="text-base font-black text-foreground tracking-tight mt-0.5">
                                    Complete Delegated Task
                                </DialogTitle>
                            </div>
                        </div>
                    </DialogHeader>

                    {activeModalTask && (
                        <div className="p-5 space-y-4">
                            {/* Summary Card */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 border rounded-2xl p-3.5 space-y-2">
                                <p className="font-extrabold text-sm text-foreground leading-snug">
                                    {activeModalTask.task_description}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                    <span className="flex items-center gap-1 font-semibold">
                                        <Briefcase size={12} className="text-purple-500" />
                                        {activeModalTask.firm_name || 'General'}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 font-semibold text-foreground">
                                        <UserCheck size={12} className="text-indigo-500" />
                                        Assigned by {activeModalTask.given_by_name || 'Manager'}
                                    </span>
                                </div>
                                {activeModalTask.require_attachment && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 p-2 rounded-xl border border-red-200 dark:border-red-800 mt-1">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>Proof photo attachment is required to complete this task</span>
                                    </div>
                                )}
                            </div>

                            {/* Remarks Textarea */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <MessageSquare size={14} className="text-emerald-600" />
                                    Completion Remarks (Optional)
                                </label>
                                <Textarea
                                    placeholder="Add completion notes or summary for assigner..."
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    className="text-xs min-h-[85px] rounded-2xl border-muted focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                />
                            </div>

                            {/* File Upload Dropzones */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <CustomFilePicker
                                    label="Photo Proof"
                                    icon={Camera}
                                    file={imageFile}
                                    accept="image/*"
                                    onFileSelect={(f) => setImageFile(f)}
                                    onFileRemove={() => setImageFile(null)}
                                    colorTheme="sky"
                                />
                                <CustomFilePicker
                                    label="Audio Note"
                                    icon={Mic}
                                    file={audioFile}
                                    accept="audio/*"
                                    onFileSelect={(f) => setAudioFile(f)}
                                    onFileRemove={() => setAudioFile(null)}
                                    colorTheme="purple"
                                />
                            </div>
                        </div>
                    )}

                    <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end gap-2.5">
                        <DialogClose asChild>
                            <Button variant="outline" className="h-9 px-4 rounded-xl text-xs font-semibold">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={handleDoneSubmit}
                            disabled={submitting}
                            className="h-9 px-5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25 gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={15} />
                                    Submit Completion
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* HIGH-PREMIUM REQUEST EXTENSION MODAL */}
            <Dialog open={modalMode === 'extend'} onOpenChange={(v) => !v && resetAndCloseModal()}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border shadow-2xl bg-card text-left">
                    {/* Header Banner */}
                    <DialogHeader className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 p-5 border-b flex flex-row items-center justify-between space-y-0 text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-2.5 rounded-2xl shadow-md shadow-amber-500/25 shrink-0">
                                <TimerReset size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                        {activeModalTask ? `DL-${activeModalTask.task_id}` : 'Task'}
                                    </span>
                                    <span className="text-xs font-semibold text-muted-foreground">Target Extension</span>
                                </div>
                                <DialogTitle className="text-base font-black text-foreground tracking-tight mt-0.5">
                                    Request Target Date Extension
                                </DialogTitle>
                            </div>
                        </div>
                    </DialogHeader>

                    {activeModalTask && (
                        <div className="p-5 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-900/60 border rounded-2xl p-3.5 space-y-1">
                                <p className="font-extrabold text-xs text-foreground">{activeModalTask.task_description}</p>
                                <p className="text-xs text-muted-foreground">
                                    Current Deadline:{' '}
                                    <strong className="text-foreground">
                                        {activeModalTask.planned_date
                                            ? new Date(activeModalTask.planned_date).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                              })
                                            : '—'}
                                    </strong>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">New Proposed Target Date & Time</label>
                                <Input
                                    type="datetime-local"
                                    value={extendDate}
                                    onChange={(e) => setExtendDate(e.target.value)}
                                    className="text-xs h-10 rounded-xl border-muted focus-visible:ring-2 focus-visible:ring-amber-500/20"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Reason for Extension</label>
                                <Textarea
                                    placeholder="Explain why target date extension is needed for assigner approval..."
                                    value={extendReason}
                                    onChange={(e) => setExtendReason(e.target.value)}
                                    className="text-xs min-h-[85px] rounded-2xl border-muted focus-visible:ring-2 focus-visible:ring-amber-500/20"
                                />
                            </div>
                        </div>
                    )}

                    <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end gap-2.5">
                        <DialogClose asChild>
                            <Button variant="outline" className="h-9 px-4 rounded-xl text-xs font-semibold">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={handleExtendSubmit}
                            disabled={submitting}
                            className="h-9 px-5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 gap-1.5"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <TimerReset size={15} />
                                    Submit Extension Request
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
