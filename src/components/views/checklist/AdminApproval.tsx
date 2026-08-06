import { useMemo, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    Check,
    X,
    TimerReset,
    ShieldCheck,
    Search,
    Clock,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Filter,
    Paperclip,
    User as UserIcon,
    Briefcase,
    Copy,
    Eye,
    CheckSquare,
    Sparkles,
} from 'lucide-react';
import Heading from '@/components/element/Heading';
import FilterToolbar from '@/components/element/FilterToolbar';
import TaskCard from '@/components/element/TaskCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MediaPreviewDialog from '@/components/element/MediaPreviewDialog';
import { useAuth } from '@/context/AuthContext';
import { isChecklistAdmin, isChecklistSuperAdmin } from '@/lib/roleAccess';
import { useChecklistData } from '@/context/ChecklistContext';
import { approveChecklistTask, rejectChecklistTask, type ChecklistTaskRow } from '@/services/checklistTaskService';
import {
    approveDelegationTask,
    approveDelegationExtension,
    rejectDelegationTask,
    type DelegationTaskRow,
} from '@/services/delegationTaskService';

type QueueItem =
    | { kind: 'checklist'; row: ChecklistTaskRow }
    | { kind: 'delegation'; row: DelegationTaskRow };

export default function AdminApproval() {
    const { user } = useAuth();
    const { checklistTasks, delegationTasks, refresh, loading } = useChecklistData();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [view, setView] = useState<'pending' | 'history'>('pending');
    const [subTab, setSubTab] = useState<'all' | 'checklist' | 'delegation'>('all');
    const [search, setSearch] = useState('');
    const [firmFilter, setFirmFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [rejectTarget, setRejectTarget] = useState<QueueItem | null>(null);
    const [rejectRemark, setRejectRemark] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [batchSubmitting, setBatchSubmitting] = useState(false);

    // GSAP Container Ref
    const containerRef = useRef<HTMLDivElement>(null);

    const showFirmFilter = isChecklistSuperAdmin(user) || (user?.firm_access?.length ?? 0) > 1;

    const pendingQueue: QueueItem[] = useMemo(() => {
        const checklistDone = checklistTasks
            .filter((row) => row.status === 'done')
            .map((row): QueueItem => ({ kind: 'checklist', row }));
        const delegationAwaiting = delegationTasks
            .filter((row) => row.status === 'done' || row.status === 'extend')
            .map((row): QueueItem => ({ kind: 'delegation', row }));
        return [...checklistDone, ...delegationAwaiting];
    }, [checklistTasks, delegationTasks]);

    const historyQueue: QueueItem[] = useMemo(() => {
        const checklistHistory = checklistTasks
            .filter((row) => row.status === 'approved' || row.status === 'rejected')
            .map((row): QueueItem => ({ kind: 'checklist', row }));
        const delegationHistory = delegationTasks
            .filter((row) => row.status === 'approved' || row.status === 'rejected')
            .map((row): QueueItem => ({ kind: 'delegation', row }));
        return [...checklistHistory, ...delegationHistory];
    }, [checklistTasks, delegationTasks]);

    const activeQueue = view === 'pending' ? pendingQueue : historyQueue;

    const stats = useMemo(() => {
        const pendingCount = pendingQueue.length;
        const approvedToday = historyQueue.filter((i) => i.row.status === 'approved').length;
        const rejectedCount = historyQueue.filter((i) => i.row.status === 'rejected').length;
        const checklistSplit = pendingQueue.filter((i) => i.kind === 'checklist').length;
        const delegationSplit = pendingQueue.filter((i) => i.kind === 'delegation').length;
        return { pendingCount, approvedToday, rejectedCount, checklistSplit, delegationSplit };
    }, [pendingQueue, historyQueue]);

    const firmOptions = useMemo(() => {
        const names = new Set<string>();
        [...pendingQueue, ...historyQueue].forEach((item) => {
            if (item.row.firm_name) names.add(item.row.firm_name);
        });
        return Array.from(names).sort();
    }, [pendingQueue, historyQueue]);

    const filteredQueue = useMemo(() => {
        return activeQueue.filter((item) => {
            if (subTab === 'checklist' && item.kind !== 'checklist') return false;
            if (subTab === 'delegation' && item.kind !== 'delegation') return false;
            if (firmFilter !== 'all' && item.row.firm_name !== firmFilter) return false;
            if (!search.trim()) return true;
            const q = search.trim().toLowerCase();
            return (
                (item.row.doer_name || '').toLowerCase().includes(q) ||
                (item.row.task_description || '').toLowerCase().includes(q) ||
                (item.row.firm_name || '').toLowerCase().includes(q) ||
                `${item.kind === 'checklist' ? 'ck' : 'dl'}-${item.row.task_id}`.includes(q)
            );
        });
    }, [activeQueue, subTab, firmFilter, search]);

    // GSAP Stagger Entrance Animation for Table Rows
    useGSAP(
        () => {
            if (containerRef.current && filteredQueue.length > 0) {
                gsap.fromTo(
                    '.approval-row',
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
        { scope: containerRef, dependencies: [filteredQueue.length, view, subTab, firmFilter, search] }
    );

    if (!isChecklistAdmin(user)) {
        return <Navigate to="/checklist/dashboard" replace />;
    }

    // Copy Task ID
    function handleCopyId(itemKey: string, chip: string) {
        navigator.clipboard.writeText(chip);
        setCopiedId(itemKey);
        toast.success(`Copied ${chip} to clipboard`);
        setTimeout(() => setCopiedId(null), 2000);
    }

    // Checkbox Selections
    function getItemKey(item: QueueItem) {
        return `${item.kind}-${item.row.task_id}`;
    }

    function toggleSelectRow(key: string) {
        setSelectedIds((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    }

    function toggleSelectAll() {
        if (selectedIds.length === filteredQueue.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredQueue.map(getItemKey));
        }
    }

    async function withBusy(id: string, action: () => Promise<void>) {
        setBusyId(id);
        try {
            await action();
            await refresh();
        } catch (error) {
            console.error('Error processing approval action:', error);
            toast.error('Action failed');
        } finally {
            setBusyId(null);
        }
    }

    function openReject(item: QueueItem) {
        setRejectTarget(item);
        setRejectRemark('');
    }

    async function confirmReject() {
        if (!rejectTarget) return;
        setRejecting(true);
        try {
            if (rejectTarget.kind === 'checklist') {
                await rejectChecklistTask(rejectTarget.row.task_id, rejectRemark || undefined);
            } else {
                await rejectDelegationTask(rejectTarget.row.task_id, rejectRemark || undefined);
            }
            await refresh();
            toast.success('Task submission rejected');
            setRejectTarget(null);
        } catch (error) {
            console.error('Error rejecting task:', error);
            toast.error('Failed to reject task');
        } finally {
            setRejecting(false);
        }
    }

    // Batch Approve Selected
    async function handleBatchApprove() {
        if (selectedIds.length === 0) return;
        setBatchSubmitting(true);
        try {
            for (const key of selectedIds) {
                const item = filteredQueue.find((i) => getItemKey(i) === key);
                if (!item) continue;

                if (item.kind === 'checklist') {
                    await approveChecklistTask(item.row.task_id);
                } else {
                    if (item.row.status === 'extend') {
                        await approveDelegationExtension(item.row.task_id);
                    } else {
                        await approveDelegationTask(item.row.task_id);
                    }
                }
            }
            toast.success(`Successfully approved ${selectedIds.length} tasks!`);
            setSelectedIds([]);
            refresh();
        } catch (err) {
            console.error('Batch approve error:', err);
            toast.error('Failed to approve selected tasks');
        } finally {
            setBatchSubmitting(false);
        }
    }

    return (
        <div ref={containerRef} className="space-y-5">
            {/* Header Title Section */}
            <Heading heading="Admin Governance & Verification Portal" subtext="Review checklist submissions, proof attachments, and delegation extensions">
                <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 p-2.5 rounded-xl shadow-md text-white">
                    <ShieldCheck size={24} />
                </div>
            </Heading>

            {/* Governance KPI Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-l-4 border-l-purple-600 bg-card shadow-2xs">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Pending Review</p>
                            <p className="text-xl font-extrabold text-purple-600 tabular-nums">{stats.pendingCount}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                            <Clock size={16} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-600 bg-card shadow-2xs">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Approved Today</p>
                            <p className="text-xl font-extrabold text-emerald-600 tabular-nums">{stats.approvedToday}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <CheckCircle2 size={16} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-600 bg-card shadow-2xs">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Rejected Total</p>
                            <p className="text-xl font-extrabold text-red-600 tabular-nums">{stats.rejectedCount}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                            <XCircle size={16} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-600 bg-card shadow-2xs">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Checklist / Delegation</p>
                            <p className="text-sm font-bold text-foreground">{stats.checklistSplit} / {stats.delegationSplit}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                            <TrendingUp size={16} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs & Search Toolbar */}
            <FilterToolbar
                activeFilterCount={firmFilter !== 'all' ? 1 : 0}
                extra={
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Tabs value={view} onValueChange={(v) => setView(v as 'pending' | 'history')}>
                                <TabsList className="h-9 bg-muted/60 p-1">
                                    <TabsTrigger value="pending" className="gap-2 text-xs px-3 py-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                        General Approvals
                                        <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold">
                                            {pendingQueue.length}
                                        </span>
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="gap-2 text-xs px-3 py-1 data-[state=active]:bg-muted-foreground data-[state=active]:text-white">
                                        Approval History
                                        <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-muted text-muted-foreground font-bold">
                                            {historyQueue.length}
                                        </span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <Tabs value={subTab} onValueChange={(v: any) => setSubTab(v)}>
                                <TabsList className="h-9 bg-muted/30 p-1">
                                    <TabsTrigger value="all" className="text-xs px-2.5 py-1">All Types</TabsTrigger>
                                    <TabsTrigger value="checklist" className="text-xs px-2.5 py-1">Checklists</TabsTrigger>
                                    <TabsTrigger value="delegation" className="text-xs px-2.5 py-1">Delegations</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Batch Actions Bar */}
                        {selectedIds.length > 0 && view === 'pending' && (
                            <div className="flex items-center justify-between gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 px-3 py-1 rounded-lg">
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                                    {selectedIds.length} Selected
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleBatchApprove}
                                    disabled={batchSubmitting}
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                >
                                    <CheckCircle2 size={13} />
                                    {batchSubmitting ? 'Approving...' : 'Approve Selected'}
                                </Button>
                            </div>
                        )}
                    </div>
                }
                search={
                    <div className="relative md:w-52">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search user, task title..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9 text-xs"
                        />
                    </div>
                }
                filters={
                    showFirmFilter && (
                        <Select value={firmFilter} onValueChange={setFirmFilter}>
                            <SelectTrigger className="w-full md:w-36 h-9 text-xs">
                                <SelectValue placeholder="All Firms" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">All Firms</SelectItem>
                                {firmOptions.map((name) => (
                                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                }
            />

            {/* MAIN ADMIN APPROVAL TABLE - 7 Exact Required Columns (desktop) */}
            <div className="hidden md:block border rounded-xl bg-card shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-10 text-center">
                                    <Checkbox
                                        checked={filteredQueue.length > 0 && selectedIds.length === filteredQueue.length}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="w-36 text-xs font-bold uppercase">User</TableHead>
                                <TableHead className="min-w-[260px] text-xs font-bold uppercase">Task Description</TableHead>
                                <TableHead className="w-32 text-xs font-bold uppercase">Project</TableHead>
                                <TableHead className="w-36 text-xs font-bold uppercase">Submission Time</TableHead>
                                <TableHead className="w-28 text-center text-xs font-bold uppercase">Proof</TableHead>
                                <TableHead className="w-36 text-center text-xs font-bold uppercase">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                                        Loading approval items...
                                    </TableCell>
                                </TableRow>
                            ) : filteredQueue.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground italic">
                                        {view === 'pending' ? 'No items awaiting administrative approval.' : 'No approval history items found.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredQueue.map((item) => {
                                    const key = getItemKey(item);
                                    const isSelected = selectedIds.includes(key);
                                    const isExtension = item.kind === 'delegation' && item.row.status === 'extend';
                                    const isApproved = item.row.status === 'approved';
                                    const isRejected = item.row.status === 'rejected';
                                    const taskChip = `${item.kind === 'checklist' ? 'CK' : 'DL'}-${item.row.task_id}`;

                                    // Parse priority if encoded in task description
                                    const rawDesc = item.row.task_description || '';
                                    const match = rawDesc.match(/^\[(P1|P2|P3)\]\s*(.*)/i);
                                    const cleanDesc = match ? match[2] : rawDesc;

                                    return (
                                        <TableRow
                                            key={key}
                                            className={`approval-row transition-colors text-xs ${
                                                isSelected ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''
                                            } ${isApproved ? 'opacity-75 bg-slate-50/40 dark:bg-slate-900/20' : ''}`}
                                        >
                                            {/* Column 1: Checkbox */}
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelectRow(key)}
                                                    aria-label={`Select task ${taskChip}`}
                                                />
                                            </TableCell>

                                            {/* Column 2: User */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="size-6 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                        {(item.row.doer_name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold text-foreground truncate max-w-[110px]" title={item.row.doer_name || 'User'}>
                                                        {item.row.doer_name || 'User'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Column 3: Task Description */}
                                            <TableCell>
                                                <div className="space-y-1 max-w-[280px]">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyId(key, taskChip)}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-extrabold text-[10px] hover:bg-muted/80"
                                                            title="Click to copy ID"
                                                        >
                                                            {copiedId === key ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                                                            <span>{taskChip}</span>
                                                        </button>

                                                        <span
                                                            className={`inline-block font-extrabold text-[10px] uppercase px-1.5 py-0.2 rounded ${
                                                                item.kind === 'checklist'
                                                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                                                    : 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                                                            }`}
                                                        >
                                                            {item.kind}
                                                        </span>

                                                        {isExtension && (
                                                            <span className="inline-block font-extrabold text-[10px] uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                                Extension Request
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="font-semibold text-foreground truncate" title={cleanDesc}>
                                                        {cleanDesc}
                                                    </p>

                                                    {item.row.remark && (
                                                        <p className="text-[11px] italic text-muted-foreground truncate" title={item.row.remark}>
                                                            &ldquo;{item.row.remark}&rdquo;
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Column 4: Project */}
                                            <TableCell>
                                                <span className="inline-flex items-center gap-1 text-muted-foreground font-medium truncate max-w-[110px]">
                                                    <Briefcase size={12} className="shrink-0 text-purple-600" />
                                                    <span className="truncate">{item.row.firm_name || '—'}</span>
                                                </span>
                                            </TableCell>

                                            {/* Column 5: Submission Time */}
                                            <TableCell className="whitespace-nowrap text-muted-foreground text-[11px]">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {item.row.submission_date
                                                        ? new Date(item.row.submission_date).toLocaleDateString('en-US', {
                                                              month: 'short',
                                                              day: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : item.row.created_at
                                                        ? new Date(item.row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                        : '—'}
                                                </span>
                                            </TableCell>

                                            {/* Column 6: Proof */}
                                            <TableCell className="text-center">
                                                {item.row.image || item.row.audio_url ? (
                                                    <MediaPreviewDialog
                                                        imageUrl={item.row.image}
                                                        audioUrl={item.row.audio_url}
                                                        title={`Submission Evidence - ${taskChip}`}
                                                        trigger={
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-[11px] gap-1 px-2.5 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:border-purple-900 dark:text-purple-300 dark:bg-purple-950/40 rounded-xl font-bold shadow-2xs"
                                                            >
                                                                <Eye size={12} className="text-purple-600" />
                                                                <span>View Proof</span>
                                                            </Button>
                                                        }
                                                    />
                                                ) : item.row.instruction_attachment_url ? (
                                                    <MediaPreviewDialog
                                                        imageUrl={item.row.instruction_attachment_url}
                                                        title={`Instruction Attachment - ${taskChip}`}
                                                        trigger={
                                                            <Button variant="ghost" size="icon" className="size-7 text-sky-600 hover:bg-sky-50">
                                                                <Paperclip size={14} />
                                                            </Button>
                                                        }
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground text-[11px]">—</span>
                                                )}
                                            </TableCell>

                                            {/* Column 7: Actions */}
                                            <TableCell className="text-center">
                                                {isApproved ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                        <CheckCircle2 size={12} /> Approved
                                                    </span>
                                                ) : isRejected ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800">
                                                        <XCircle size={12} /> Rejected
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1">
                                                        {isExtension ? (
                                                            <Button
                                                                size="sm"
                                                                className="h-7 text-[11px] px-2 bg-amber-600 hover:bg-amber-700 text-white gap-1"
                                                                disabled={busyId === key}
                                                                onClick={() => withBusy(key, () => approveDelegationExtension(item.row.task_id))}
                                                                title="Approve Extension"
                                                            >
                                                                <TimerReset size={13} /> Extend
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                                                disabled={busyId === key}
                                                                onClick={() =>
                                                                    withBusy(key, () =>
                                                                        item.kind === 'checklist'
                                                                            ? approveChecklistTask(item.row.task_id)
                                                                            : approveDelegationTask(item.row.task_id)
                                                                    )
                                                                }
                                                                title="Approve Task"
                                                            >
                                                                <Check size={13} /> Approve
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="h-7 text-[11px] px-2 gap-1"
                                                            disabled={busyId === key}
                                                            onClick={() => openReject(item)}
                                                            title="Reject Submission"
                                                        >
                                                            <X size={13} /> Reject
                                                        </Button>
                                                    </div>
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

            {/* MOBILE CARD LIST - one card per approval item, replaces the table below md */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <p className="py-10 text-center text-xs text-muted-foreground">Loading approval items...</p>
                ) : filteredQueue.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground italic">
                        {view === 'pending' ? 'No items awaiting administrative approval.' : 'No approval history items found.'}
                    </p>
                ) : (
                    filteredQueue.map((item) => {
                        const key = getItemKey(item);
                        const isSelected = selectedIds.includes(key);
                        const isExtension = item.kind === 'delegation' && item.row.status === 'extend';
                        const isApproved = item.row.status === 'approved';
                        const isRejected = item.row.status === 'rejected';
                        const taskChip = `${item.kind === 'checklist' ? 'CK' : 'DL'}-${item.row.task_id}`;

                        const rawDesc = item.row.task_description || '';
                        const match = rawDesc.match(/^\[(P1|P2|P3)\]\s*(.*)/i);
                        const cleanDesc = match ? match[2] : rawDesc;

                        return (
                            <TaskCard
                                key={key}
                                idChip={taskChip}
                                onCopyId={() => handleCopyId(key, taskChip)}
                                idCopied={copiedId === key}
                                selected={isSelected}
                                onToggleSelect={() => toggleSelectRow(key)}
                                muted={isApproved}
                                title={cleanDesc}
                                priorityTag={
                                    <span
                                        className={`inline-block font-extrabold text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                            item.kind === 'checklist'
                                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                                : 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                                        }`}
                                    >
                                        {item.kind}
                                    </span>
                                }
                                statusBadge={
                                    isApproved ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle2 size={12} /> Approved
                                        </span>
                                    ) : isRejected ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800">
                                            <XCircle size={12} /> Rejected
                                        </span>
                                    ) : isExtension ? (
                                        <span className="inline-block font-extrabold text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                            Extension Request
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-bold text-muted-foreground">Pending</span>
                                    )
                                }
                                meta={[
                                    { icon: <UserIcon size={12} />, label: 'User', value: item.row.doer_name || 'User' },
                                    { icon: <Briefcase size={12} />, label: 'Project', value: item.row.firm_name || '—' },
                                    {
                                        icon: <Clock size={12} />,
                                        label: 'Submitted',
                                        value: item.row.submission_date
                                            ? new Date(item.row.submission_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : item.row.created_at
                                            ? new Date(item.row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            : '—',
                                    },
                                ]}
                                remark={item.row.remark ? `"${item.row.remark}"` : undefined}
                                actions={
                                    <>
                                        {item.row.image || item.row.audio_url ? (
                                            <MediaPreviewDialog
                                                imageUrl={item.row.image}
                                                audioUrl={item.row.audio_url}
                                                title={`Submission Evidence - ${taskChip}`}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-2.5 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:border-purple-900 dark:text-purple-300 dark:bg-purple-950/40 rounded-lg font-bold">
                                                        <Eye size={13} /> Proof
                                                    </Button>
                                                }
                                            />
                                        ) : item.row.instruction_attachment_url ? (
                                            <MediaPreviewDialog
                                                imageUrl={item.row.instruction_attachment_url}
                                                title={`Instruction Attachment - ${taskChip}`}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-2.5 text-sky-600 rounded-lg">
                                                        <Paperclip size={13} /> Attachment
                                                    </Button>
                                                }
                                            />
                                        ) : null}

                                        {!isApproved && !isRejected && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8 text-xs px-2.5 gap-1 rounded-lg"
                                                    disabled={busyId === key}
                                                    onClick={() => openReject(item)}
                                                    title="Reject Submission"
                                                >
                                                    <X size={13} /> Reject
                                                </Button>
                                                {isExtension ? (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white gap-1 rounded-lg"
                                                        disabled={busyId === key}
                                                        onClick={() => withBusy(key, () => approveDelegationExtension(item.row.task_id))}
                                                        title="Approve Extension"
                                                    >
                                                        <TimerReset size={13} /> Extend
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 rounded-lg"
                                                        disabled={busyId === key}
                                                        onClick={() =>
                                                            withBusy(key, () =>
                                                                item.kind === 'checklist'
                                                                    ? approveChecklistTask(item.row.task_id)
                                                                    : approveDelegationTask(item.row.task_id)
                                                            )
                                                        }
                                                        title="Approve Task"
                                                    >
                                                        <Check size={13} /> Approve
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </>
                                }
                            />
                        );
                    })
                )}
            </div>

            {/* Reject Reason Dialog */}
            <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-600">
                            <XCircle size={18} />
                            Reject Task Submission
                        </DialogTitle>
                    </DialogHeader>
                    {rejectTarget && (
                        <div className="space-y-3 pt-1">
                            <div className="rounded-lg bg-muted/40 p-3 text-xs border space-y-1">
                                <p className="font-bold text-foreground">{rejectTarget.row.task_description}</p>
                                <p className="text-muted-foreground">
                                    Project: {rejectTarget.row.firm_name} • Doer: {rejectTarget.row.doer_name}
                                </p>
                            </div>
                            <Textarea
                                placeholder="Provide rejection reason or feedback for rework..."
                                value={rejectRemark}
                                onChange={(e) => setRejectRemark(e.target.value)}
                                className="text-xs min-h-[80px]"
                            />
                        </div>
                    )}
                    <DialogFooter className="pt-2">
                        <DialogClose asChild>
                            <Button variant="ghost" className="text-xs h-9">Cancel</Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={confirmReject} disabled={rejecting} className="gap-2 text-xs h-9">
                            <X className="size-4" />
                            {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
