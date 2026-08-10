import { useMemo, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    CheckCircle2,
    XCircle,
    ImagePlus,
    Mic,
    Paperclip,
    Copy,
    Check,
    Search,
    Briefcase,
    Calendar,
    UserCheck,
    User,
    Bell,
    BellOff,
    Clock,
    Sparkles,
    FileText,
    MessageSquare,
    Filter,
    CheckSquare,
    Layers,
    Eye,
    CalendarDays,
    Loader2,
    AlertCircle,
    Camera,
    Trash2,
    AlertTriangle,
    History,
} from 'lucide-react';
import Heading from '@/components/element/Heading';
import FilterToolbar from '@/components/element/FilterToolbar';
import TaskCard from '@/components/element/TaskCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import MediaPreviewDialog from '@/components/element/MediaPreviewDialog';
import { uploadFile } from '@/lib/fetchers';
import { useChecklistData } from '@/context/ChecklistContext';
import { submitChecklistTask, type ChecklistTaskRow } from '@/services/checklistTaskService';
import { SearchableSelect } from '@/components/ui/searchable-select';
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

export default function ChecklistSubmission() {
    const { checklistTasks, loading, refresh } = useChecklistData();
    const [mainTab, setMainTab] = useState<'pending' | 'history'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
    const [dateHorizon, setDateHorizon] = useState<'today_plus_1' | 'all'>('today_plus_1');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Dynamic Filter State
    const [doerFilter, setDoerFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [assignedByFilter, setAssignedByFilter] = useState<string>('all');

    // Extract unique options dynamically from checklistTasks dataset
    const doerOptions = useMemo(() => {
        const set = new Set<string>();
        checklistTasks.forEach((t) => {
            if (t.doer_name && t.doer_name.trim()) set.add(t.doer_name.trim());
        });
        const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
        return [
            { value: 'all', label: 'All Doers' },
            ...sorted.map((name) => ({ value: name, label: name })),
        ];
    }, [checklistTasks]);

    const projectOptions = useMemo(() => {
        const set = new Set<string>();
        checklistTasks.forEach((t) => {
            if (t.firm_name && t.firm_name.trim()) set.add(t.firm_name.trim());
        });
        const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
        return [
            { value: 'all', label: 'All Projects' },
            ...sorted.map((name) => ({ value: name, label: name })),
        ];
    }, [checklistTasks]);

    const priorityOptions = [
        { value: 'all', label: 'All Priorities' },
        { value: 'P1', label: 'P1 - High Priority' },
        { value: 'P2', label: 'P2 - Medium Priority' },
        { value: 'P3', label: 'P3 - Low Priority' },
    ];

    const assignedByOptions = useMemo(() => {
        const set = new Set<string>();
        checklistTasks.forEach((t) => {
            if (t.given_by_name && t.given_by_name.trim()) set.add(t.given_by_name.trim());
        });
        const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
        return [
            { value: 'all', label: 'All Assigners' },
            ...sorted.map((name) => ({ value: name, label: name })),
        ];
    }, [checklistTasks]);

    // History Tab Filter State
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'done' | 'approved' | 'rejected'>('all');

    // Batch infinite scroll state
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Modal state for task completion or exceptions
    const [activeModalTask, setActiveModalTask] = useState<ChecklistTaskRow | null>(null);
    const [modalAction, setModalAction] = useState<'done' | 'not_done' | null>(null);
    const [remark, setRemark] = useState('');
    const [notDoneReason, setNotDoneReason] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Batch submit state
    const [batchSubmitting, setBatchSubmitting] = useState(false);

    // Refs for GSAP animations
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    // Filter tasks based on Date Horizon (Today + 1 Upcoming), Status, Search, and 4 Dynamic Dropdowns
    const filteredTasks = useMemo(() => {
        let tasks = checklistTasks;

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
            if (statusFilter === 'pending') {
                tasks = tasks.filter((t) => (t.status || 'pending').toLowerCase() === 'pending' || (t.status || '').toLowerCase() === 'rejected');
            } else if (statusFilter === 'done') {
                tasks = tasks.filter((t) => (t.status || '').toLowerCase() === 'done' || (t.status || '').toLowerCase() === 'approved');
            }
        }

        if (doerFilter !== 'all') {
            tasks = tasks.filter((t) => (t.doer_name || '').trim().toLowerCase() === doerFilter.trim().toLowerCase());
        }

        if (projectFilter !== 'all') {
            tasks = tasks.filter((t) => (t.firm_name || '').trim().toLowerCase() === projectFilter.trim().toLowerCase());
        }

        if (priorityFilter !== 'all') {
            tasks = tasks.filter((t) => {
                const rawDesc = t.task_description || '';
                const match = rawDesc.match(/^\[(P1|P2|P3)\]\s*(.*)/i);
                const taskPriority = match ? match[1].toUpperCase() : 'P2';
                return taskPriority === priorityFilter;
            });
        }

        if (assignedByFilter !== 'all') {
            tasks = tasks.filter((t) => (t.given_by_name || '').trim().toLowerCase() === assignedByFilter.trim().toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            tasks = tasks.filter(
                (t) =>
                    (t.task_description || '').toLowerCase().includes(q) ||
                    (t.firm_name || '').toLowerCase().includes(q) ||
                    (t.doer_name || '').toLowerCase().includes(q) ||
                    (t.given_by_name || '').toLowerCase().includes(q) ||
                    (t.frequency || '').toLowerCase().includes(q) ||
                    `ck-${t.task_id}`.includes(q)
            );
        }
        return tasks;
    }, [checklistTasks, dateHorizon, searchQuery, statusFilter, doerFilter, projectFilter, priorityFilter, assignedByFilter]);

    // Submitted / Completed Tasks History
    const historyTasks = useMemo(() => {
        let tasks = checklistTasks.filter(
            (t) => (t.status && t.status !== 'pending') || Boolean(t.submission_date)
        );

        if (historyStatusFilter !== 'all') {
            tasks = tasks.filter((t) => (t.status || '').toLowerCase() === historyStatusFilter.toLowerCase());
        }

        if (doerFilter !== 'all') {
            tasks = tasks.filter((t) => (t.doer_name || '').trim().toLowerCase() === doerFilter.trim().toLowerCase());
        }

        if (projectFilter !== 'all') {
            tasks = tasks.filter((t) => (t.firm_name || '').trim().toLowerCase() === projectFilter.trim().toLowerCase());
        }

        if (priorityFilter !== 'all') {
            tasks = tasks.filter((t) => {
                const rawDesc = t.task_description || '';
                const match = rawDesc.match(/^\[(P1|P2|P3)\]\s*(.*)/i);
                const taskPriority = match ? match[1].toUpperCase() : 'P2';
                return taskPriority === priorityFilter;
            });
        }

        if (assignedByFilter !== 'all') {
            tasks = tasks.filter((t) => (t.given_by_name || '').trim().toLowerCase() === assignedByFilter.trim().toLowerCase());
        }

        if (historySearchQuery.trim()) {
            const q = historySearchQuery.toLowerCase().trim();
            tasks = tasks.filter(
                (t) =>
                    (t.task_description || '').toLowerCase().includes(q) ||
                    (t.firm_name || '').toLowerCase().includes(q) ||
                    (t.doer_name || '').toLowerCase().includes(q) ||
                    (t.given_by_name || '').toLowerCase().includes(q) ||
                    (t.remark || '').toLowerCase().includes(q) ||
                    `ck-${t.task_id}`.includes(q)
            );
        }

        return tasks.sort((a, b) => {
            const dA = new Date(a.submission_date || a.created_at || 0).getTime();
            const dB = new Date(b.submission_date || b.created_at || 0).getTime();
            return dB - dA;
        });
    }, [checklistTasks, historyStatusFilter, historySearchQuery, doerFilter, projectFilter, priorityFilter, assignedByFilter]);

    // History metrics
    const historyTotal = historyTasks.length;
    const historyApproved = historyTasks.filter((t) => t.status === 'approved').length;
    const historyPendingAdmin = historyTasks.filter((t) => t.status === 'done').length;
    const historyRejected = historyTasks.filter((t) => t.status === 'rejected').length;

    // Reset pagination window when filters change
    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [dateHorizon, statusFilter, searchQuery, doerFilter, projectFilter, priorityFilter, assignedByFilter]);

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

    // Compliance statistics
    const totalAllToday = filteredTasks.length;
    const completedToday = filteredTasks.filter((t) => t.status === 'done' || t.status === 'approved').length;
    const completionPercent = totalAllToday > 0 ? Math.round((completedToday / totalAllToday) * 100) : 0;

    // GSAP Animation for Table Rows Stagger
    useGSAP(
        () => {
            if (containerRef.current && paginatedTasks.length > 0) {
                gsap.fromTo(
                    '.checklist-row',
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
        { scope: containerRef, dependencies: [paginatedTasks.length, statusFilter, dateHorizon, searchQuery] }
    );

    // GSAP Animation for Progress Fill Bar
    useGSAP(
        () => {
            if (progressRef.current) {
                gsap.to(progressRef.current, {
                    width: `${completionPercent}%`,
                    duration: 0.8,
                    ease: 'power3.out',
                });
            }
        },
        { dependencies: [completionPercent] }
    );

    // Copy Task ID
    function handleCopyId(taskId: number) {
        navigator.clipboard.writeText(`CK-${taskId}`);
        setCopiedId(taskId);
        toast.success(`Copied CK-${taskId} to clipboard`);
        setTimeout(() => setCopiedId(null), 2000);
    }

    // Toggle row selection
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
    function openDoneModal(task: ChecklistTaskRow) {
        setActiveModalTask(task);
        setModalAction('done');
        setRemark(task.remark || '');
        setImageFile(null);
        setAudioFile(null);
    }

    function openNotDoneModal(task: ChecklistTaskRow) {
        setActiveModalTask(task);
        setModalAction('not_done');
        setNotDoneReason('');
    }

    // Single Submit Done
    async function handleDoneSubmit() {
        if (!activeModalTask) return;
        if (activeModalTask.require_attachment && !imageFile) {
            toast.error('This checklist task requires a proof photo attachment');
            return;
        }

        setSubmitting(true);
        try {
            const [imageUrl, audioUrl] = await Promise.all([
                imageFile ? uploadFile({ file: imageFile, folderId: 'checklist', subFolder: 'proof-images' }) : Promise.resolve(null),
                audioFile ? uploadFile({ file: audioFile, folderId: 'checklist', subFolder: 'proof-audio' }) : Promise.resolve(null),
            ]);

            await submitChecklistTask(activeModalTask.task_id, {
                image: imageUrl,
                audio_url: audioUrl,
                remark: remark || null,
            });

            toast.success(`Checklist task CK-${activeModalTask.task_id} completed successfully!`);
            setActiveModalTask(null);
            setModalAction(null);
            refresh();
        } catch (error) {
            console.error('Error completing checklist task:', error);
            toast.error('Failed to submit checklist task');
        } finally {
            setSubmitting(false);
        }
    }

    // Single Submit Not Done
    async function handleNotDoneSubmit() {
        if (!activeModalTask) return;
        if (!notDoneReason.trim()) {
            toast.error('Please provide a reason for not performing task');
            return;
        }

        setSubmitting(true);
        try {
            await submitChecklistTask(activeModalTask.task_id, {
                remark: `[NOT DONE REASON]: ${notDoneReason}`,
            });

            toast.success(`Task CK-${activeModalTask.task_id} marked as Not Done`);
            setActiveModalTask(null);
            setModalAction(null);
            refresh();
        } catch (error) {
            console.error('Error logging Not Done status:', error);
            toast.error('Failed to record status');
        } finally {
            setSubmitting(false);
        }
    }

    // Batch Complete Selected
    async function handleBatchComplete() {
        if (selectedIds.length === 0) return;
        setBatchSubmitting(true);
        try {
            for (const id of selectedIds) {
                await submitChecklistTask(id, { remark: 'Batch completed via Checklist Submission' });
            }
            toast.success(`Successfully completed ${selectedIds.length} checklist tasks!`);
            setSelectedIds([]);
            refresh();
        } catch (error) {
            console.error('Batch complete error:', error);
            toast.error('Failed to complete selected tasks');
        } finally {
            setBatchSubmitting(false);
        }
    }

    return (
        <div ref={containerRef} className="space-y-5">
            {/* Header Title Section */}
            <Heading heading="Daily Routine Checklist Execution" subtext="View, track and execute recurring routine checklist tasks">
                <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 rounded-xl shadow-md text-white">
                    <FileText size={24} />
                </div>
            </Heading>

            <Tabs defaultValue="pending" value={mainTab} onValueChange={(val: any) => setMainTab(val)} className="w-full space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-2 sm:p-2.5 rounded-2xl border shadow-xs">
                    <TabsList className="bg-muted/60 p-1 rounded-xl w-full sm:w-auto grid grid-cols-2">
                        <TabsTrigger value="pending" className="gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">
                            <CheckSquare size={15} className="text-sky-600 shrink-0" />
                            <span className="truncate">Pending Execution</span>
                            <span className="ml-0.5 sm:ml-1 bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                                {checklistTasks.filter((t) => !t.status || t.status === 'pending').length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">
                            <History size={15} className="text-purple-600 shrink-0" />
                            <span className="truncate">Submission History</span>
                            <span className="ml-0.5 sm:ml-1 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                                {checklistTasks.filter((t) => (t.status && t.status !== 'pending') || Boolean(t.submission_date)).length}
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="pending" className="mt-0 space-y-5">
                    {/* Compliance Progress Banner */}
            <Card className="bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 border-sky-200 dark:border-sky-900/60 shadow-2xs">
                <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
                    <div className="space-y-1 w-full md:w-auto">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-foreground">Shift Progress Compliance</span>
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                                {completedToday} / {totalAllToday} Tasks Completed
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Keep all scheduled routine checklist items executed on time</p>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full md:w-64 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-muted-foreground">Compliance</span>
                            <span className="text-sky-600 dark:text-sky-400">{completionPercent}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                            <div
                                ref={progressRef}
                                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
                                style={{ width: '0%' }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filter Bar & Controls */}
            <FilterToolbar
                activeFilterCount={
                    (dateHorizon !== 'today_plus_1' ? 1 : 0) +
                    (statusFilter !== 'all' ? 1 : 0) +
                    (doerFilter !== 'all' ? 1 : 0) +
                    (projectFilter !== 'all' ? 1 : 0) +
                    (priorityFilter !== 'all' ? 1 : 0) +
                    (assignedByFilter !== 'all' ? 1 : 0)
                }
                extra={
                    selectedIds.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 p-2 sm:px-3 sm:py-1 rounded-lg w-full sm:w-auto">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-300 text-center sm:text-left">
                                {selectedIds.length} Selected
                            </span>
                            <Button
                                size="sm"
                                onClick={handleBatchComplete}
                                disabled={batchSubmitting}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 w-full sm:w-auto"
                            >
                                <CheckCircle2 size={13} />
                                {batchSubmitting ? 'Completing...' : 'Mark Selected Done'}
                            </Button>
                        </div>
                    )
                }
                search={
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search description, project, doer..."
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
                            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs bg-muted/30 border-muted">
                                <CalendarDays size={13} className="mr-1.5 text-sky-600 shrink-0" />
                                <SelectValue placeholder="Date Window" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today_plus_1" className="text-xs font-semibold">
                                    Today & Upcoming
                                </SelectItem>
                                <SelectItem value="all" className="text-xs">
                                    All Generated Dates
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger className="w-full sm:w-[125px] h-9 text-xs">
                                <Filter size={13} className="mr-1 text-muted-foreground shrink-0" />
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                                <SelectItem value="done" className="text-xs">Completed</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Searchable Doer Filter */}
                        <SearchableSelect
                            options={doerOptions}
                            value={doerFilter}
                            onValueChange={(v) => setDoerFilter(v)}
                            placeholder="Filter Doer"
                            searchPlaceholder="Search doer name..."
                            emptyText="No doers found"
                            className="w-full sm:w-[145px] h-9 text-xs"
                        />

                        {/* Searchable Project Filter */}
                        <SearchableSelect
                            options={projectOptions}
                            value={projectFilter}
                            onValueChange={(v) => setProjectFilter(v)}
                            placeholder="Filter Project"
                            searchPlaceholder="Search project..."
                            emptyText="No projects found"
                            className="w-full sm:w-[150px] h-9 text-xs"
                        />

                        {/* Searchable Priority Filter */}
                        <SearchableSelect
                            options={priorityOptions}
                            value={priorityFilter}
                            onValueChange={(v) => setPriorityFilter(v)}
                            placeholder="Filter Priority"
                            searchPlaceholder="Search priority..."
                            emptyText="No priority matches"
                            className="w-full sm:w-[140px] h-9 text-xs"
                        />

                        {/* Searchable Assigned By Filter */}
                        <SearchableSelect
                            options={assignedByOptions}
                            value={assignedByFilter}
                            onValueChange={(v) => setAssignedByFilter(v)}
                            placeholder="Filter Assigned By"
                            searchPlaceholder="Search assigner..."
                            emptyText="No assigners found"
                            className="w-full sm:w-[150px] h-9 text-xs"
                        />

                        {/* Reset All Filters Button */}
                        {(dateHorizon !== 'today_plus_1' || statusFilter !== 'all' || doerFilter !== 'all' || projectFilter !== 'all' || priorityFilter !== 'all' || assignedByFilter !== 'all' || searchQuery !== '') && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setDateHorizon('today_plus_1');
                                    setStatusFilter('all');
                                    setDoerFilter('all');
                                    setProjectFilter('all');
                                    setPriorityFilter('all');
                                    setAssignedByFilter('all');
                                    setSearchQuery('');
                                }}
                                className="h-9 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0 font-semibold"
                            >
                                Reset Filters
                            </Button>
                        )}
                    </>
                }
            />

            {/* MAIN CHECKLIST TABLE - 14 Required Columns (desktop) */}
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
                                <TableHead className="w-20 text-xs font-bold uppercase">Priority</TableHead>
                                <TableHead className="min-w-[220px] text-xs font-bold uppercase">Description</TableHead>
                                <TableHead className="w-32 text-xs font-bold uppercase">Project</TableHead>
                                <TableHead className="w-32 text-xs font-bold uppercase">Assigned By</TableHead>
                                <TableHead className="w-32 text-xs font-bold uppercase">Doer Name</TableHead>
                                <TableHead className="w-36 text-xs font-bold uppercase">Planned Date</TableHead>
                                <TableHead className="w-28 text-xs font-bold uppercase">Frequency</TableHead>
                                <TableHead className="w-28 text-xs font-bold uppercase">Reminder</TableHead>
                                <TableHead className="w-24 text-xs font-bold uppercase">Status</TableHead>
                                <TableHead className="min-w-[150px] text-xs font-bold uppercase">Remark</TableHead>
                                <TableHead className="w-28 text-center text-xs font-bold uppercase">Attachment</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={14} className="h-32 text-center text-xs text-muted-foreground">
                                        Loading checklist items...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedTasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={14} className="h-32 text-center text-xs text-muted-foreground italic">
                                        No routine checklist tasks found for selected filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTasks.map((task) => {
                                    const isDone = (task.status || '').toLowerCase() === 'done' || (task.status || '').toLowerCase() === 'approved';
                                    const isSelected = selectedIds.includes(task.task_id);
                                    const taskChip = `CK-${task.task_id}`;

                                    // Parse Priority tag from description (e.g. "[P1] Check inventory")
                                    const rawDesc = task.task_description || '';
                                    const match = rawDesc.match(/^\[(P1|P2|P3)\]\s*(.*)/i);
                                    const priorityCode = match ? (match[1].toUpperCase() as 'P1' | 'P2' | 'P3') : 'P2';
                                    const cleanDesc = match ? match[2] : rawDesc;

                                    return (
                                        <TableRow
                                            key={task.task_id}
                                            className={`checklist-row transition-colors text-xs ${
                                                isSelected ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
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
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            size="icon"
                                                            onClick={() => openDoneModal(task)}
                                                            className="size-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs"
                                                            title="Mark Task Done"
                                                        >
                                                            <CheckCircle2 size={14} />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() => openNotDoneModal(task)}
                                                            className="size-7 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 rounded-lg"
                                                            title="Log Not Done"
                                                        >
                                                            <XCircle size={14} />
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

                                            {/* Column 4: Priority */}
                                            <TableCell>
                                                <span
                                                    className={`inline-block font-extrabold text-[10px] uppercase px-2 py-0.5 rounded border ${
                                                        priorityCode === 'P1'
                                                            ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                                                            : priorityCode === 'P2'
                                                            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                                            : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                    }`}
                                                >
                                                    {priorityCode}
                                                </span>
                                            </TableCell>

                                            {/* Column 5: Description */}
                                            <TableCell className="font-medium text-foreground">
                                                <div>{cleanDesc}</div>
                                                {(task.status || '').toLowerCase() === 'rejected' && (
                                                    <div className="mt-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-bold bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded-md border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 w-fit">
                                                        <AlertTriangle size={13} className="shrink-0 text-rose-600" />
                                                        <span>Rejection Reason: {task.remark || 'Rejected by Admin'}</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Column 6: Project */}
                                            <TableCell className="text-muted-foreground font-semibold">
                                                {task.firm_name || '—'}
                                            </TableCell>

                                            {/* Column 7: Assigned By */}
                                            <TableCell className="text-muted-foreground">
                                                {task.given_by_name || 'Admin'}
                                            </TableCell>

                                            {/* Column 8: Doer Name */}
                                            <TableCell className="font-bold text-foreground">
                                                {task.doer_name || 'Unassigned'}
                                            </TableCell>

                                            {/* Column 9: Planned Date */}
                                            <TableCell className="text-muted-foreground">
                                                {task.planned_date ? new Date(task.planned_date).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                }) : '—'}
                                            </TableCell>

                                            {/* Column 10: Frequency */}
                                            <TableCell>
                                                <span className="capitalize font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 text-[11px]">
                                                    {task.frequency || 'routine'}
                                                </span>
                                            </TableCell>

                                            {/* Column 11: Reminder */}
                                            <TableCell>
                                                {task.enable_reminder ? (
                                                    <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold text-[11px]">
                                                        <Bell size={12} /> {task.reminder_days_before || 1}d before
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/60 flex items-center gap-1 text-[11px]">
                                                        <BellOff size={12} /> Off
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Column 12: Status */}
                                            <TableCell>
                                                {(task.status || '').toLowerCase() === 'rejected' ? (
                                                    <span className="capitalize font-extrabold text-[11px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                                        Rejected (Redo)
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={`capitalize font-bold text-[11px] px-2 py-0.5 rounded ${
                                                            isDone
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                        }`}
                                                    >
                                                        {task.status || 'pending'}
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Column 13: Remark */}
                                            <TableCell className="text-muted-foreground italic truncate max-w-[180px]">
                                                {task.remark || '—'}
                                            </TableCell>

                                            {/* Column 14: Attachment */}
                                            <TableCell className="text-center">
                                                {task.image || task.audio_url ? (
                                                    <MediaPreviewDialog
                                                        imageUrl={task.image}
                                                        audioUrl={task.audio_url}
                                                        trigger={
                                                            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2">
                                                                <Eye size={12} /> View
                                                            </Button>
                                                        }
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground/50 text-[11px]">—</span>
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
                    <p className="py-10 text-center text-xs text-muted-foreground">Loading checklist items...</p>
                ) : paginatedTasks.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground italic">No routine checklist tasks found for selected filters.</p>
                ) : (
                    paginatedTasks.map((task) => {
                        const isDone = (task.status || '').toLowerCase() === 'done' || (task.status || '').toLowerCase() === 'approved';
                        const isSelected = selectedIds.includes(task.task_id);
                        const taskChip = `CK-${task.task_id}`;

                        const rawDesc = task.task_description || '';
                        const match = rawDesc.match(/^\[(P1|P2|P3)\]\s*(.*)/i);
                        const priorityCode = match ? (match[1].toUpperCase() as 'P1' | 'P2' | 'P3') : 'P2';
                        const cleanDesc = match ? match[2] : rawDesc;

                        return (
                            <TaskCard
                                key={task.task_id}
                                idChip={taskChip}
                                onCopyId={() => handleCopyId(task.task_id)}
                                idCopied={copiedId === task.task_id}
                                selected={isSelected}
                                onToggleSelect={() => toggleSelectRow(task.task_id)}
                                muted={isDone}
                                title={cleanDesc}
                                priorityTag={
                                    <span
                                        className={`inline-block font-extrabold text-[10px] uppercase px-2 py-0.5 rounded border ${
                                            priorityCode === 'P1'
                                                ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                                                : priorityCode === 'P2'
                                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                                : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                        }`}
                                    >
                                        {priorityCode}
                                    </span>
                                }
                                statusBadge={
                                    <span
                                        className={`capitalize font-bold text-[11px] px-2 py-0.5 rounded ${
                                            isDone
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                        }`}
                                    >
                                        {task.status || 'pending'}
                                    </span>
                                }
                                meta={[
                                    { icon: <Briefcase size={12} />, label: 'Project', value: task.firm_name || '—' },
                                    { icon: <UserCheck size={12} />, label: 'Doer', value: task.doer_name || 'Unassigned' },
                                    { icon: <User size={12} />, label: 'By', value: task.given_by_name || 'Admin' },
                                    {
                                        icon: <CalendarDays size={12} />,
                                        label: 'Planned',
                                        value: task.planned_date
                                            ? new Date(task.planned_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : '—',
                                    },
                                    { icon: <Layers size={12} />, label: 'Frequency', value: <span className="capitalize">{task.frequency || 'routine'}</span> },
                                    {
                                        icon: task.enable_reminder ? <Bell size={12} /> : <BellOff size={12} />,
                                        label: 'Reminder',
                                        value: task.enable_reminder ? `${task.reminder_days_before || 1}d before` : 'Off',
                                    },
                                ]}
                                remark={task.remark ? `Remark: ${task.remark}` : undefined}
                                actions={
                                    <>
                                        {(task.image || task.audio_url) && (
                                            <MediaPreviewDialog
                                                imageUrl={task.image}
                                                audioUrl={task.audio_url}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2">
                                                        <Eye size={12} /> View
                                                    </Button>
                                                }
                                            />
                                        )}
                                        {isDone ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                <CheckCircle2 size={12} /> Done
                                            </span>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openNotDoneModal(task)}
                                                    className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 rounded-lg gap-1"
                                                >
                                                    <XCircle size={13} /> Not Done
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => openDoneModal(task)}
                                                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs gap-1"
                                                >
                                                    <CheckCircle2 size={13} /> Mark Done
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
            <div ref={loadMoreRef} className="p-3 text-center border bg-card rounded-xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2 px-4">
                <span className="text-xs text-muted-foreground font-medium">
                    Showing <strong className="text-foreground">{paginatedTasks.length}</strong> of{' '}
                    <strong className="text-foreground">{filteredTasks.length}</strong> tasks
                </span>

                {visibleCount < filteredTasks.length ? (
                    <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-bold">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Loading next batch...</span>
                    </div>
                ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                        All tasks loaded
                    </span>
                )}
            </div>
        </TabsContent>

        {/* SUBMISSION HISTORY TAB */}
        <TabsContent value="history" className="mt-0 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3 bg-card border shadow-xs">
                    <p className="text-[11px] font-bold uppercase text-muted-foreground">Total Submissions</p>
                    <p className="text-xl font-black text-foreground mt-1">{historyTotal}</p>
                </Card>
                <Card className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 shadow-xs">
                    <p className="text-[11px] font-bold uppercase text-sky-700 dark:text-sky-300">Pending Review</p>
                    <p className="text-xl font-black text-sky-800 dark:text-sky-200 mt-1">{historyPendingAdmin}</p>
                </Card>
                <Card className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 shadow-xs">
                    <p className="text-[11px] font-bold uppercase text-red-700 dark:text-red-300">Rejected</p>
                    <p className="text-xl font-black text-red-800 dark:text-red-200 mt-1">{historyRejected}</p>
                </Card>
            </div>

            {/* Filter Toolbar for History */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-card p-3 rounded-xl border shadow-xs">
                <div className="relative w-full lg:w-64">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search submitted tasks, doer, project..."
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Select value={historyStatusFilter} onValueChange={(v: any) => setHistoryStatusFilter(v)}>
                        <SelectTrigger className="h-9 text-xs w-full sm:w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                            <SelectItem value="done" className="text-xs">Pending Approval (Done)</SelectItem>
                            <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                            <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
                        </SelectContent>
                    </Select>

                    <SearchableSelect
                        options={doerOptions}
                        value={doerFilter}
                        onValueChange={(v) => setDoerFilter(v)}
                        placeholder="Filter Doer"
                        searchPlaceholder="Search doer..."
                        emptyText="No doers found"
                        className="w-full sm:w-[140px] h-9 text-xs"
                    />

                    <SearchableSelect
                        options={projectOptions}
                        value={projectFilter}
                        onValueChange={(v) => setProjectFilter(v)}
                        placeholder="Filter Project"
                        searchPlaceholder="Search project..."
                        emptyText="No projects found"
                        className="w-full sm:w-[145px] h-9 text-xs"
                    />

                    <SearchableSelect
                        options={priorityOptions}
                        value={priorityFilter}
                        onValueChange={(v) => setPriorityFilter(v)}
                        placeholder="Filter Priority"
                        searchPlaceholder="Search priority..."
                        emptyText="No priority matches"
                        className="w-full sm:w-[135px] h-9 text-xs"
                    />

                    <SearchableSelect
                        options={assignedByOptions}
                        value={assignedByFilter}
                        onValueChange={(v) => setAssignedByFilter(v)}
                        placeholder="Filter Assigned By"
                        searchPlaceholder="Search assigner..."
                        emptyText="No assigners found"
                        className="w-full sm:w-[145px] h-9 text-xs"
                    />
                </div>
            </div>

            {/* Desktop Submissions Table */}
            <div className="hidden md:block border rounded-xl bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="text-xs">
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-bold">Task ID</TableHead>
                                <TableHead className="font-bold min-w-[200px]">Task Description</TableHead>
                                <TableHead className="font-bold">Project / Firm</TableHead>
                                <TableHead className="font-bold">Doer</TableHead>
                                <TableHead className="font-bold">Submission Date</TableHead>
                                <TableHead className="font-bold text-center">Proof Attachments</TableHead>
                                <TableHead className="font-bold min-w-[160px]">Doer Remark</TableHead>
                                <TableHead className="font-bold text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyTasks.length > 0 ? (
                                historyTasks.map((t) => (
                                    <TableRow key={t.task_id} className="hover:bg-muted/20">
                                        <TableCell className="font-mono font-bold">
                                            <button onClick={() => handleCopyId(t.task_id)} className="hover:text-primary inline-flex items-center gap-1">
                                                CK-{t.task_id}
                                                {copiedId === t.task_id ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} className="opacity-50" />}
                                            </button>
                                        </TableCell>
                                        <TableCell className="font-medium max-w-xs"><p className="line-clamp-2">{t.task_description}</p></TableCell>
                                        <TableCell className="text-muted-foreground">{t.firm_name || '—'}</TableCell>
                                        <TableCell className="font-semibold">{t.doer_name || '—'}</TableCell>
                                        <TableCell className="text-muted-foreground font-mono">
                                            {t.submission_date ? new Date(t.submission_date).toLocaleString() : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <MediaPreviewDialog
                                                imageUrl={t.image}
                                                audioUrl={t.audio_url}
                                                title={`Proofs for Task CK-${t.task_id}`}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs"><p className="line-clamp-2 italic">{t.remark || 'No remark'}</p></TableCell>
                                        <TableCell className="text-center">
                                            {t.status === 'approved' ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                                    Approved
                                                </span>
                                            ) : t.status === 'rejected' ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300">
                                                    Rejected
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300">
                                                    Submitted (Pending Review)
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground italic">
                                        No submitted checklist tasks found in history
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Mobile History Card View */}
            <div className="md:hidden space-y-3">
                {historyTasks.length > 0 ? (
                    historyTasks.map((t) => (
                        <TaskCard
                            key={t.task_id}
                            idChip={`CK-${t.task_id}`}
                            onCopyId={() => handleCopyId(t.task_id)}
                            idCopied={copiedId === t.task_id}
                            title={t.task_description}
                            statusBadge={
                                t.status === 'approved' ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                        Approved
                                    </span>
                                ) : t.status === 'rejected' ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300">
                                        Rejected
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300">
                                        Pending Review
                                    </span>
                                )
                            }
                            meta={[
                                { icon: <Briefcase size={12} />, label: 'Project', value: t.firm_name || '—' },
                                { icon: <UserCheck size={12} />, label: 'Doer', value: t.doer_name || '—' },
                                {
                                    icon: <CalendarDays size={12} />,
                                    label: 'Submitted',
                                    value: t.submission_date ? new Date(t.submission_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
                                },
                            ]}
                            remark={t.remark ? `Remark: ${t.remark}` : undefined}
                            actions={
                                (t.image || t.audio_url) && (
                                    <MediaPreviewDialog
                                        imageUrl={t.image}
                                        audioUrl={t.audio_url}
                                        title={`Proofs for Task CK-${t.task_id}`}
                                    />
                                )
                            }
                        />
                    ))
                ) : (
                    <p className="py-12 text-center text-xs text-muted-foreground italic">
                        No submitted checklist tasks found in history
                    </p>
                )}
            </div>
        </TabsContent>
    </Tabs>

    {/* HIGH-PREMIUM TASK COMPLETION DIALOG */}
            <Dialog open={modalAction === 'done'} onOpenChange={(open) => !open && setModalAction(null)}>
                <DialogContent className="w-[95vw] sm:max-w-lg p-0 overflow-hidden rounded-2xl sm:rounded-3xl border shadow-2xl bg-card max-h-[92vh] flex flex-col">
                    {/* Header Banner with Vibrant Gradient Icon Badge */}
                    <DialogHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 p-4 sm:p-5 border-b flex flex-row items-center justify-between space-y-0 text-left shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2.5 rounded-2xl shadow-md shadow-emerald-500/25 shrink-0">
                                <CheckCircle2 size={22} />
                            </div>
                            <div className="text-left min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0">
                                        {activeModalTask ? `CK-${activeModalTask.task_id}` : 'Task'}
                                    </span>
                                    <span className="text-xs font-semibold text-muted-foreground truncate">Checklist Execution</span>
                                </div>
                                <DialogTitle className="text-base font-black text-foreground tracking-tight mt-0.5 truncate">
                                    Complete Routine Checklist Task
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    Complete routine checklist task with optional remarks and proof attachments.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {activeModalTask && (
                        <div className="p-4 sm:p-5 space-y-4 text-left overflow-y-auto max-h-[calc(92vh-130px)]">
                            {/* Task Info Summary Card */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 border rounded-2xl p-3.5 space-y-2">
                                {(() => {
                                    const rawDesc = activeModalTask.task_description || '';
                                    const match = rawDesc.match(/^\[(P1|P2|P3)\]\s*(.*)/i);
                                    const priorityCode = match ? (match[1].toUpperCase() as 'P1' | 'P2' | 'P3') : 'P2';
                                    const cleanDesc = match ? match[2] : rawDesc;
                                    return (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'font-extrabold text-[10px] uppercase px-2 py-0.5 rounded border shrink-0',
                                                        priorityCode === 'P1'
                                                            ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                                                            : priorityCode === 'P2'
                                                            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                                                            : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                                    )}
                                                >
                                                    {priorityCode}
                                                </span>
                                                <p className="font-extrabold text-sm text-foreground leading-snug break-words">
                                                    {cleanDesc}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                                <span className="flex items-center gap-1 font-semibold">
                                                    <Briefcase size={12} className="text-purple-500 shrink-0" />
                                                    {activeModalTask.firm_name || 'General'}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1 font-semibold text-foreground">
                                                    <UserCheck size={12} className="text-sky-500 shrink-0" />
                                                    {activeModalTask.doer_name || 'Unassigned'}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}

                                {activeModalTask.status === 'rejected' && (
                                    <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 rounded-2xl text-xs text-rose-800 dark:text-rose-200 space-y-1">
                                        <p className="font-extrabold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                                            <AlertTriangle size={15} className="shrink-0" /> Previous Submission Rejected By Admin
                                        </p>
                                        <p className="text-[11px] font-medium">Rejection Reason: <strong className="font-bold">{activeModalTask.remark || 'No reason provided'}</strong></p>
                                        <p className="text-[10px] text-muted-foreground pt-0.5">Please attach updated proof photo/voice note and resubmit. Assigned date and time will remain unchanged.</p>
                                    </div>
                                )}

                                {activeModalTask.require_attachment && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 p-2 rounded-xl border border-red-200 dark:border-red-800">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>Photo proof attachment is required to submit this task</span>
                                    </div>
                                )}
                            </div>

                            {/* Execution Remark Textarea */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <MessageSquare size={14} className="text-emerald-600" />
                                    Execution Remark (Optional)
                                </label>
                                <Textarea
                                    placeholder="Enter detailed execution remarks or comments..."
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    className="text-xs min-h-[85px] rounded-2xl border-muted focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                />
                            </div>

                            {/* Styled Custom File Picker Dropzones */}
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

                    {/* Dialog Footer Actions */}
                    <div className="p-3.5 sm:p-4 border-t bg-slate-50/50 dark:bg-slate-900/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
                        <DialogClose asChild>
                            <Button variant="outline" className="h-9 px-4 rounded-xl text-xs font-semibold w-full sm:w-auto">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={handleDoneSubmit}
                            disabled={submitting}
                            className="h-9 px-5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25 gap-2 w-full sm:w-auto"
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

            {/* HIGH-PREMIUM LOG NOT DONE EXCEPTION DIALOG */}
            <Dialog open={modalAction === 'not_done'} onOpenChange={(open) => !open && setModalAction(null)}>
                <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden rounded-2xl sm:rounded-3xl border shadow-2xl bg-card text-left max-h-[92vh] flex flex-col">
                    {/* Header Banner */}
                    <DialogHeader className="bg-gradient-to-r from-rose-500/10 via-red-500/10 to-amber-500/10 p-4 sm:p-5 border-b flex flex-row items-center justify-between space-y-0 text-left shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white p-2.5 rounded-2xl shadow-md shadow-rose-500/25 shrink-0">
                                <XCircle size={22} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 shrink-0">
                                        {activeModalTask ? `CK-${activeModalTask.task_id}` : 'Task'}
                                    </span>
                                    <span className="text-xs font-semibold text-muted-foreground truncate">Exception Logging</span>
                                </div>
                                <DialogTitle className="text-base font-black text-foreground tracking-tight mt-0.5 truncate">
                                    Log Task Not Performed
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    Log reason for not performing this routine checklist task.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {activeModalTask && (
                        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[calc(92vh-130px)]">
                            <p className="text-xs text-muted-foreground font-medium">
                                Specify why this routine checklist item could not be executed today:
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                                    Reason for Exception
                                </label>
                                <Textarea
                                    placeholder="Explain reason (e.g. equipment down, missing supplies, emergency...)"
                                    value={notDoneReason}
                                    onChange={(e) => setNotDoneReason(e.target.value)}
                                    className="text-xs min-h-[90px] rounded-2xl border-muted focus-visible:ring-2 focus-visible:ring-rose-500/20"
                                />
                            </div>
                        </div>
                    )}

                    <div className="p-3.5 sm:p-4 border-t bg-slate-50/50 dark:bg-slate-900/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
                        <DialogClose asChild>
                            <Button variant="outline" className="h-9 px-4 rounded-xl text-xs font-semibold w-full sm:w-auto">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleNotDoneSubmit}
                            disabled={submitting}
                            className="h-9 px-5 rounded-xl text-xs font-bold gap-1.5 shadow-lg shadow-rose-600/20 w-full sm:w-auto"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Recording...
                                </>
                            ) : (
                                <>
                                    <XCircle size={15} />
                                    Log Not Done
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
