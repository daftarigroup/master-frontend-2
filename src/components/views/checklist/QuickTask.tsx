import { useEffect, useMemo, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Zap, Mic, Square, Image as ImageIcon, Plus, Search,
    SquarePen, Lock, Copy, Check, CheckSquare, ClipboardList, Layers, RefreshCw,
} from 'lucide-react';
import Heading from '@/components/element/Heading';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { isChecklistAdmin } from '@/lib/roleAccess';
import { fetchUsers, type UserRecord } from '@/services/userService';
import { fetchMasterOptions } from '@/services/masterService';
import {
    assignTask, updateChecklistTaskGroup,
    type ChecklistTaskRow, type ChecklistFrequency,
} from '@/services/checklistTaskService';
import { updateDelegationTask, type DelegationTaskRow } from '@/services/delegationTaskService';
import { useChecklistData } from '@/context/ChecklistContext';
import { uploadFile } from '@/lib/fetchers';

interface ChecklistTaskGroup {
    anchorId: number;
    occurrenceCount: number;
    rep: ChecklistTaskRow;
}

function taskFingerprint(t: ChecklistTaskRow): string {
    return [String(t.doer_id ?? ''), String(t.firm_id ?? ''), (t.task_description ?? '').trim(), (t.frequency ?? '').toLowerCase()].join('||');
}

function deriveUniqueGroups(tasks: ChecklistTaskRow[]): ChecklistTaskGroup[] {
    const map = new Map<string, { minId: number; rep: ChecklistTaskRow; count: number }>();
    for (const t of tasks) {
        const fp = taskFingerprint(t);
        const existing = map.get(fp);
        if (!existing) { map.set(fp, { minId: t.task_id, rep: t, count: 1 }); }
        else { existing.count += 1; if (t.task_id < existing.minId) { existing.minId = t.task_id; existing.rep = t; } }
    }
    return Array.from(map.values()).map(({ minId, rep, count }) => ({ anchorId: minId, occurrenceCount: count, rep })).sort((a, b) => a.anchorId - b.anchorId);
}

export default function QuickTask() {
    const { user } = useAuth();
    const { checklistTasks, delegationTasks, refresh, loading } = useChecklistData();
    const [doers, setDoers] = useState<UserRecord[]>([]);
    const [firmOptions, setFirmOptions] = useState<{ id: number; name: string }[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [activeTab, setActiveTab] = useState<'checklist' | 'delegation'>('checklist');
    const [searchQuery, setSearchQuery] = useState('');
    const [firmFilter, setFirmFilter] = useState<string>('all');
    const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    // Create modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createFirmId, setCreateFirmId] = useState('');
    const [createDoerId, setCreateDoerId] = useState('');
    const [createTaskDesc, setCreateTaskDesc] = useState('');
    const [createStartDate, setCreateStartDate] = useState(new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16));
    const [createDuration, setCreateDuration] = useState('30 MIN');
    const [createFrequency, setCreateFrequency] = useState<ChecklistFrequency>('one-time');
    const [createRequireAttachment, setCreateRequireAttachment] = useState(false);
    const [createPriority] = useState<'P1' | 'P2' | 'P3'>('P2');
    const [createImageFile, setCreateImageFile] = useState<File | null>(null);
    const [createAudioBlob, setCreateAudioBlob] = useState<Blob | null>(null);
    const [createAudioUrl, setCreateAudioUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordTimer, setRecordTimer] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<any>(null);
    const [isCreating, setIsCreating] = useState(false);
    // Edit modal
    const [editingGroup, setEditingGroup] = useState<ChecklistTaskGroup | null>(null);
    const [editingDelegation, setEditingDelegation] = useState<DelegationTaskRow | null>(null);
    const [editTaskDesc, setEditTaskDesc] = useState('');
    const [editDoerId, setEditDoerId] = useState('');
    const [editFirmId, setEditFirmId] = useState('');
    const [editFrequency, setEditFrequency] = useState<string>('daily');
    const [editDuration, setEditDuration] = useState('');
    const [editRequireAttachment, setEditRequireAttachment] = useState(false);
    const [editRemark, setEditRemark] = useState('');
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editAudioBlob, setEditAudioBlob] = useState<Blob | null>(null);
    const [editAudioUrl, setEditAudioUrl] = useState<string | null>(null);
    const [isEditingRecording, setIsEditingRecording] = useState(false);
    const [editRecordTimer, setEditRecordTimer] = useState(0);
    const editMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const editTimerRef = useRef<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const permittedFirms = useMemo(() => {
        if (!user?.firm_access?.length) return firmOptions;
        return firmOptions.filter((f) => user.firm_access.includes(String(f.id)) || user.firm_access.includes(f.name));
    }, [firmOptions, user?.firm_access]);

    useEffect(() => {
        Promise.all([fetchUsers(), fetchMasterOptions(user?.role === 'SUPER_ADMIN' ? undefined : user?.firm_access)])
            .then(([users, masterOptions]) => { setDoers(users.filter((u) => u.role === 'USER' || !u.role)); setFirmOptions(masterOptions.firmObjects || []); })
            .catch(() => toast.error('Failed to load doers/projects'))
            .finally(() => setLoadingOptions(false));
    }, [user?.role, user?.firm_access]);

    if (!isChecklistAdmin(user)) return <Navigate to="/checklist/dashboard" replace />;

    const allUniqueGroups = useMemo(() => deriveUniqueGroups(checklistTasks), [checklistTasks]);

    const filteredUniqueGroups = useMemo(() => {
        let list = allUniqueGroups;
        if (firmFilter !== 'all') list = list.filter((g) => String(g.rep.firm_id) === firmFilter || g.rep.firm_name === firmFilter);
        if (frequencyFilter !== 'all') list = list.filter((g) => (g.rep.frequency || '').toLowerCase() === frequencyFilter.toLowerCase());
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((g) => (g.rep.task_description || '').toLowerCase().includes(q) || (g.rep.doer_name || '').toLowerCase().includes(q) || (g.rep.given_by_name || '').toLowerCase().includes(q) || (g.rep.firm_name || '').toLowerCase().includes(q) || `cl-${g.anchorId}`.includes(q));
        }
        return list;
    }, [allUniqueGroups, firmFilter, frequencyFilter, searchQuery]);

    const filteredDelegationTasks = useMemo(() => {
        let list = delegationTasks;
        if (firmFilter !== 'all') list = list.filter((t) => String(t.firm_id) === firmFilter || t.firm_name === firmFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((t) => (t.task_description || '').toLowerCase().includes(q) || (t.doer_name || '').toLowerCase().includes(q) || (t.given_by_name || '').toLowerCase().includes(q) || (t.firm_name || '').toLowerCase().includes(q) || `dl-${t.task_id}`.includes(q));
        }
        return list;
    }, [delegationTasks, firmFilter, searchQuery]);

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); setCopiedId(text); toast.success(`Copied ${text} to clipboard`); setTimeout(() => setCopiedId(null), 2000); };

    const handleOpenGroupEditModal = (group: ChecklistTaskGroup) => {
        const t = group.rep;
        setEditingGroup(group); setEditingDelegation(null);
        setEditTaskDesc(t.task_description || ''); setEditDoerId(t.doer_id ? String(t.doer_id) : '');
        setEditFirmId(t.firm_id ? String(t.firm_id) : ''); setEditFrequency(t.frequency || 'daily');
        setEditDuration(t.duration || '30 MIN'); setEditRequireAttachment(Boolean(t.require_attachment));
        setEditRemark(t.remark || ''); setEditImageFile(null); setEditAudioBlob(null); setEditAudioUrl(t.audio_url || null);
    };

    const handleOpenDelegationEditModal = (t: DelegationTaskRow) => {
        setEditingDelegation(t); setEditingGroup(null);
        setEditTaskDesc(t.task_description || ''); setEditDoerId(t.doer_id ? String(t.doer_id) : '');
        setEditFirmId(t.firm_id ? String(t.firm_id) : ''); setEditFrequency('one-time');
        setEditDuration(t.duration || '30 MIN'); setEditRequireAttachment(Boolean(t.require_attachment));
        setEditRemark(t.remark || ''); setEditImageFile(null); setEditAudioBlob(null); setEditAudioUrl(t.audio_url || null);
    };

    const isEditModalOpen = Boolean(editingGroup || editingDelegation);
    const closeEditModal = () => { setEditingGroup(null); setEditingDelegation(null); };

    async function startEditRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream); const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => { const blob = new Blob(chunks, { type: 'audio/webm' }); setEditAudioBlob(blob); setEditAudioUrl(URL.createObjectURL(blob)); stream.getTracks().forEach((tr) => tr.stop()); };
            recorder.start(); editMediaRecorderRef.current = recorder; setIsEditingRecording(true); setEditRecordTimer(0);
            editTimerRef.current = setInterval(() => setEditRecordTimer((p) => p + 1), 1000);
        } catch { toast.error('Microphone access permission required'); }
    }
    function stopEditRecording() { if (editMediaRecorderRef.current && isEditingRecording) { editMediaRecorderRef.current.stop(); setIsEditingRecording(false); clearInterval(editTimerRef.current); } }

    async function handleSaveTaskEdit() {
        if (!editTaskDesc.trim()) { toast.error('Task description is required'); return; }
        setIsUpdating(true);
        try {
            let uploadedImageUrl: string | undefined; let uploadedAudioUrl: string | undefined;
            if (editImageFile) uploadedImageUrl = await uploadFile({ file: editImageFile, folderId: 'checklist', subFolder: 'task-edits' });
            if (editAudioBlob) { const af = new File([editAudioBlob], `task_edit_audio_${Date.now()}.webm`, { type: 'audio/webm' }); uploadedAudioUrl = await uploadFile({ file: af, folderId: 'checklist', subFolder: 'task-edit-audio' }); }
            const payload: any = { task_description: editTaskDesc.trim(), doer_id: editDoerId ? Number(editDoerId) : undefined, firm_id: editFirmId ? Number(editFirmId) : undefined, duration: editDuration || null, require_attachment: editRequireAttachment, remark: editRemark.trim() || null, ...(uploadedImageUrl ? { instruction_attachment_url: uploadedImageUrl } : {}), ...(uploadedAudioUrl ? { audio_url: uploadedAudioUrl } : {}) };
            if (editingGroup) { payload.frequency = editFrequency as ChecklistFrequency; const result = await updateChecklistTaskGroup(editingGroup.anchorId, payload); toast.success(`Updated ${result.updatedCount} occurrence${result.updatedCount !== 1 ? 's' : ''} of this recurring task`); }
            else if (editingDelegation) { await updateDelegationTask(editingDelegation.task_id, payload); toast.success(`Delegation task DL-${editingDelegation.task_id} updated`); }
            closeEditModal(); refresh();
        } catch (err) { console.error('Error updating task:', err); toast.error('Failed to update task'); }
        finally { setIsUpdating(false); }
    }

    async function startCreateRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream); const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => { const blob = new Blob(chunks, { type: 'audio/webm' }); setCreateAudioBlob(blob); setCreateAudioUrl(URL.createObjectURL(blob)); stream.getTracks().forEach((tr) => tr.stop()); };
            recorder.start(); mediaRecorderRef.current = recorder; setIsRecording(true); setRecordTimer(0);
            timerRef.current = setInterval(() => setRecordTimer((p) => p + 1), 1000);
        } catch { toast.error('Microphone access permission required'); }
    }
    function stopCreateRecording() { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(timerRef.current); } }

    async function handleCreateTask() {
        if (!createFirmId || !createDoerId || !createTaskDesc.trim()) { toast.error('Please fill in Project, Doer, and Task Description'); return; }
        const firm = firmOptions.find((f) => String(f.id) === createFirmId); const doer = doers.find((d) => String(d.id) === createDoerId);
        if (!firm || !doer) { toast.error('Please select a valid project and doer'); return; }
        setIsCreating(true);
        try {
            let uploadedImageUrl: string | null = null; let uploadedAudioUrl: string | null = null;
            if (createImageFile) uploadedImageUrl = await uploadFile({ file: createImageFile, folderId: 'checklist', subFolder: 'quicktask-attachments' });
            if (createAudioBlob) { const af = new File([createAudioBlob], `quicktask_audio_${Date.now()}.webm`, { type: 'audio/webm' }); uploadedAudioUrl = await uploadFile({ file: af, folderId: 'checklist', subFolder: 'quicktask-audio' }); }
            await assignTask({ firm_id: firm.id, firm_name: firm.name, doer_id: doer.id, doer_name: doer.name, task_description: `[${createPriority}] ${createTaskDesc.trim()}`, frequency: createFrequency, task_start_date: new Date(createStartDate).toISOString(), duration: createDuration || null, require_attachment: createRequireAttachment, enable_reminder: false, instruction_attachment_url: uploadedImageUrl || undefined, instruction_attachment_type: uploadedImageUrl ? 'image' : undefined, audio_url: uploadedAudioUrl || undefined });
            toast.success('New task created successfully'); setIsCreateModalOpen(false); setCreateTaskDesc(''); setCreateAudioBlob(null); setCreateAudioUrl(null); setCreateImageFile(null); refresh();
        } catch { toast.error('Failed to create task'); }
        finally { setIsCreating(false); }
    }

    const editSourceTask = editingGroup?.rep ?? editingDelegation ?? null;
    const isChecklistEdit = Boolean(editingGroup);

    return (
        <div className="space-y-6">
            <Heading heading="Quick Task Studio" subtext="Unique task definition registry — edit once to update all recurrences">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading} className="gap-2 text-xs">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold gap-2 shadow-md rounded-xl">
                        <Plus size={16} />Assign New Task
                    </Button>
                </div>
            </Heading>

            <Tabs defaultValue="checklist" value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-3 rounded-2xl border shadow-xs">
                    <TabsList className="bg-muted/60 p-1 rounded-xl">
                        <TabsTrigger value="checklist" className="gap-2 px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">
                            <CheckSquare size={15} className="text-purple-600" /><span>Checklist (Recurring)</span>
                            <span className="ml-1 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">{filteredUniqueGroups.length} unique</span>
                        </TabsTrigger>
                        <TabsTrigger value="delegation" className="gap-2 px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">
                            <ClipboardList size={15} className="text-blue-600" /><span>Delegation (One-Time)</span>
                            <span className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">{delegationTasks.length}</span>
                        </TabsTrigger>
                    </TabsList>
                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input placeholder="Search task ID, title, doer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-xs rounded-xl" />
                        </div>
                        <Select value={firmFilter} onValueChange={setFirmFilter}>
                            <SelectTrigger className="h-9 text-xs w-36 rounded-xl"><SelectValue placeholder="All Projects" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Projects</SelectItem>{permittedFirms.map((f) => (<SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>))}</SelectContent>
                        </Select>
                        {activeTab === 'checklist' && (
                            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                                <SelectTrigger className="h-9 text-xs w-36 rounded-xl"><SelectValue placeholder="All Frequencies" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Frequencies</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem><SelectItem value="alternate-day">Alternate Day</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem><SelectItem value="fortnight">Fortnight</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <TabsContent value="checklist" className="mt-0">
                    <div className="mb-3 flex items-start gap-2.5 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-800 dark:text-purple-300">
                        <Layers size={15} className="shrink-0 mt-0.5 text-purple-600" />
                        <span>Each row represents a <strong>unique recurring task definition</strong>. The <strong>Occurrences</strong> badge shows how many scheduled instances share this definition. Editing propagates changes to <em>all</em> occurrences in that recurrence group.</span>
                    </div>
                    <Card className="shadow-xs overflow-hidden border"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-xs">
                        <thead><tr className="bg-muted/50 text-muted-foreground border-b text-left">
                            <th className="py-3 px-4 font-bold uppercase tracking-wider text-center w-24">Actions</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Task ID</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider min-w-[220px]">Task Description</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Doer</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Assign By</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Project / Firm</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Planned Date</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Frequency</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Duration</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider text-center">Proof Req</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider text-center">Occurrences</th>
                        </tr></thead>
                        <tbody className="divide-y">
                            {loading ? (<tr><td colSpan={11} className="py-12 text-center text-muted-foreground"><RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-50" />Loading task definitions...</td></tr>)
                            : filteredUniqueGroups.length > 0 ? filteredUniqueGroups.map((group) => {
                                const t = group.rep; const idStr = `CL-${group.anchorId}`;
                                return (<tr key={group.anchorId} className="hover:bg-muted/20 transition-colors">
                                    <td className="py-2.5 px-4 text-center"><Button size="sm" onClick={() => handleOpenGroupEditModal(group)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 h-8 px-3 rounded-lg shadow-2xs"><SquarePen size={13} />Edit</Button></td>
                                    <td className="py-2.5 px-4 font-mono font-bold text-foreground"><button onClick={() => copyToClipboard(idStr)} className="hover:text-primary transition-colors inline-flex items-center gap-1" title="Click to copy ID">{idStr}{copiedId === idStr ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} className="text-muted-foreground opacity-60" />}</button></td>
                                    <td className="py-2.5 px-4 font-medium max-w-sm"><p className="line-clamp-2 leading-relaxed text-foreground">{t.task_description}</p></td>
                                    <td className="py-2.5 px-4 font-semibold text-foreground">{t.doer_name || 'Unassigned'}</td>
                                    <td className="py-2.5 px-4 text-muted-foreground">{t.given_by_name || 'System Admin'}</td>
                                    <td className="py-2.5 px-4 text-muted-foreground font-medium">{t.firm_name || '—'}</td>
                                    <td className="py-2.5 px-4 text-muted-foreground">{t.planned_date ? new Date(t.planned_date).toLocaleDateString() : '—'}</td>
                                    <td className="py-2.5 px-4"><span className="capitalize px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">{t.frequency || 'Daily'}</span></td>
                                    <td className="py-2.5 px-4 text-muted-foreground">{t.duration || '30 MIN'}</td>
                                    <td className="py-2.5 px-4 text-center">{t.require_attachment ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Required</span> : <span className="text-[10px] font-semibold text-muted-foreground">Optional</span>}</td>
                                    <td className="py-2.5 px-4 text-center"><span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800"><Layers size={10} />{group.occurrenceCount}</span></td>
                                </tr>);
                            }) : (<tr><td colSpan={11} className="py-12 text-center text-muted-foreground italic">No unique recurring task definitions found</td></tr>)}
                        </tbody>
                    </table></div></CardContent></Card>
                </TabsContent>

                <TabsContent value="delegation" className="mt-0">
                    <Card className="shadow-xs overflow-hidden border"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-xs">
                        <thead><tr className="bg-muted/50 text-muted-foreground border-b text-left">
                            <th className="py-3 px-4 font-bold uppercase tracking-wider text-center w-24">Actions</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Task ID</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider min-w-[220px]">Task Description</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Doer</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Assign By</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Project / Firm</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Planned Date</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Frequency</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider">Duration</th>
                            <th className="py-3 px-4 font-bold uppercase tracking-wider text-center">Proof Req</th>
                        </tr></thead>
                        <tbody className="divide-y">
                            {loading ? (<tr><td colSpan={10} className="py-12 text-center text-muted-foreground"><RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-50" />Loading delegation tasks...</td></tr>)
                            : filteredDelegationTasks.length > 0 ? filteredDelegationTasks.map((t) => (
                                <tr key={t.task_id} className="hover:bg-muted/20 transition-colors">
                                    <td className="py-2.5 px-4 text-center"><Button size="sm" onClick={() => handleOpenDelegationEditModal(t)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 h-8 px-3 rounded-lg shadow-2xs"><SquarePen size={13} />Edit</Button></td>
                                    <td className="py-2.5 px-4 font-mono font-bold text-foreground"><button onClick={() => copyToClipboard(`DL-${t.task_id}`)} className="hover:text-primary transition-colors inline-flex items-center gap-1" title="Click to copy ID">DL-{t.task_id}{copiedId === `DL-${t.task_id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} className="text-muted-foreground opacity-60" />}</button></td>
                                    <td className="py-2.5 px-4 font-medium max-w-sm"><p className="line-clamp-2 leading-relaxed text-foreground">{t.task_description}</p></td>
                                    <td className="py-2.5 px-4 font-semibold text-foreground">{t.doer_name || 'Unassigned'}</td>
                                    <td className="py-2.5 px-4 text-muted-foreground">{t.given_by_name || 'System Admin'}</td>
                                    <td className="py-2.5 px-4 text-muted-foreground font-medium">{t.firm_name || '—'}</td>
                                    <td className="py-2.5 px-4 text-muted-foreground">{t.planned_date ? new Date(t.planned_date).toLocaleDateString() : '—'}</td>
                                    <td className="py-2.5 px-4"><span className="capitalize px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">One-Time</span></td>
                                    <td className="py-2.5 px-4 text-muted-foreground">{t.duration || '30 MIN'}</td>
                                    <td className="py-2.5 px-4 text-center">{t.require_attachment ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Required</span> : <span className="text-[10px] font-semibold text-muted-foreground">Optional</span>}</td>
                                </tr>
                            )) : (<tr><td colSpan={10} className="py-12 text-center text-muted-foreground italic">No one-time delegation tasks found</td></tr>)}
                        </tbody>
                    </table></div></CardContent></Card>
                </TabsContent>
            </Tabs>

            {/* EDIT MODAL */}
            <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && closeEditModal()}>
                <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
                    {editSourceTask && (<>
                        <DialogHeader className="p-5 border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"><SquarePen size={20} /></div>
                                    <div>
                                        <DialogTitle className="text-lg font-bold text-foreground">
                                            {isChecklistEdit ? `Edit Recurring Task Group · CL-${editingGroup!.anchorId}` : `Edit Delegation Task · DL-${editingDelegation!.task_id}`}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-muted-foreground">
                                            {isChecklistEdit ? `Changes will apply to all ${editingGroup!.occurrenceCount} occurrence${editingGroup!.occurrenceCount !== 1 ? 's' : ''} of this recurrence group` : 'Modify this one-time delegation task'}
                                        </DialogDescription>
                                    </div>
                                </div>
                                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-muted text-foreground border">{isChecklistEdit ? 'Recurring Task' : 'One-Time Task'}</span>
                            </div>
                        </DialogHeader>
                        <div className="p-5 space-y-5">
                            {isChecklistEdit && editingGroup && editingGroup.occurrenceCount > 1 && (
                                <div className="p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-start gap-3">
                                    <Layers size={16} className="text-violet-600 shrink-0 mt-0.5" />
                                    <div className="text-xs space-y-1">
                                        <p className="font-bold text-violet-900 dark:text-violet-300">Bulk Recurrence Update — {editingGroup.occurrenceCount} Occurrences</p>
                                        <p className="text-violet-800/80 dark:text-violet-400/80 leading-relaxed">This task has <strong>{editingGroup.occurrenceCount}</strong> scheduled occurrences. Saving will update <em>all of them</em> simultaneously. Start dates &amp; planned dates are preserved.</p>
                                    </div>
                                </div>
                            )}
                            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                <Lock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1">
                                    <p className="font-bold text-amber-900 dark:text-amber-300">Start Date &amp; Time Constraint (Read-Only)</p>
                                    <p className="text-amber-800/80 dark:text-amber-400/80 leading-relaxed">Start date and time cannot be modified after task generation to preserve calendar occurrence tracking.</p>
                                    <div className="pt-1.5 flex items-center gap-2">
                                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-background border text-foreground">Planned Date: {editSourceTask.planned_date ? new Date(editSourceTask.planned_date).toLocaleString() : '—'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Project / Firm</label>
                                    <Select value={editFirmId} onValueChange={setEditFirmId}>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select project" /></SelectTrigger>
                                        <SelectContent>{permittedFirms.map((f) => (<SelectItem key={f.id} value={String(f.id)} className="text-xs">{f.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Assignee / Doer</label>
                                    <Select value={editDoerId} onValueChange={setEditDoerId}>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select doer" /></SelectTrigger>
                                        <SelectContent>{doers.map((d) => (<SelectItem key={d.id} value={String(d.id)} className="text-xs">{d.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                {isChecklistEdit && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Frequency</label>
                                        <Select value={editFrequency} onValueChange={setEditFrequency}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                                                <SelectItem value="alternate-day" className="text-xs">Alternate Day</SelectItem>
                                                <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                                                <SelectItem value="fortnight" className="text-xs">Fortnight</SelectItem>
                                                <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                                                <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem>
                                                <SelectItem value="yearly" className="text-xs">Yearly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Duration / Target Time</label>
                                    <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="e.g. 30 MIN, 1 HOUR" className="h-9 text-xs" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Task Title &amp; Details</label>
                                <Textarea value={editTaskDesc} onChange={(e) => setEditTaskDesc(e.target.value)} placeholder="Task description..." className="min-h-[80px] text-xs" />
                            </div>
                            <div className="p-3 bg-muted/30 rounded-xl border space-y-3">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="edit-require-proof" checked={editRequireAttachment} onCheckedChange={(checked: boolean) => setEditRequireAttachment(checked)} />
                                    <label htmlFor="edit-require-proof" className="text-xs font-bold cursor-pointer">Require Doer Verification Proof (Photo / Audio)</label>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-muted-foreground">Admin Instructions / Remark</label>
                                    <Input value={editRemark} onChange={(e) => setEditRemark(e.target.value)} placeholder="Additional guidance for doer..." className="h-8 text-xs" />
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/20 rounded-xl border">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {!isEditingRecording
                                        ? <Button type="button" variant="outline" size="sm" onClick={startEditRecording} className="gap-2 text-xs border-red-200 hover:bg-red-50 hover:text-red-600"><Mic size={14} className="text-red-500" />Record Voice Note</Button>
                                        : <Button type="button" variant="destructive" size="sm" onClick={stopEditRecording} className="gap-2 text-xs animate-pulse"><Square size={14} />Stop ({editRecordTimer}s)</Button>}
                                    {editAudioUrl && <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">Voice Note Attached</span>}
                                </div>
                                <label className="cursor-pointer w-full sm:w-auto">
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditImageFile(e.target.files?.[0] || null)} />
                                    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-xs text-muted-foreground hover:text-foreground">
                                        <ImageIcon size={14} className="text-blue-500" /><span>{editImageFile ? editImageFile.name.slice(0, 15) : 'Instruction Photo'}</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <DialogFooter className="p-4 border-t bg-muted/10 gap-2">
                            <Button variant="outline" size="sm" onClick={closeEditModal}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveTaskEdit} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                                {isUpdating ? 'Saving Changes...' : isChecklistEdit && editingGroup && editingGroup.occurrenceCount > 1 ? `Update All ${editingGroup.occurrenceCount} Occurrences` : 'Save Task Changes'}
                            </Button>
                        </DialogFooter>
                    </>)}
                </DialogContent>
            </Dialog>

            {/* CREATE MODAL */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-xl p-0 gap-0">
                    <DialogHeader className="p-5 border-b bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40"><Zap size={20} /></div>
                            <div><DialogTitle className="text-lg font-bold">Assign New Task</DialogTitle><DialogDescription className="text-xs text-muted-foreground">Instant creation of One-Time or Recurring Checklist tasks</DialogDescription></div>
                        </div>
                    </DialogHeader>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold uppercase text-muted-foreground">Project / Firm</label>
                                <Select value={createFirmId} onValueChange={setCreateFirmId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{permittedFirms.map((f) => (<SelectItem key={f.id} value={String(f.id)} className="text-xs">{f.name}</SelectItem>))}</SelectContent></Select>
                            </div>
                            <div className="space-y-1"><label className="text-xs font-bold uppercase text-muted-foreground">Assignee / Doer</label>
                                <Select value={createDoerId} onValueChange={setCreateDoerId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select doer" /></SelectTrigger><SelectContent>{doers.map((d) => (<SelectItem key={d.id} value={String(d.id)} className="text-xs">{d.name}</SelectItem>))}</SelectContent></Select>
                            </div>
                            <div className="space-y-1"><label className="text-xs font-bold uppercase text-muted-foreground">Frequency</label>
                                <Select value={createFrequency} onValueChange={(val: any) => setCreateFrequency(val)}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="one-time" className="text-xs">One-Time (Delegation)</SelectItem><SelectItem value="daily" className="text-xs">Daily (Checklist)</SelectItem>
                                        <SelectItem value="alternate-day" className="text-xs">Alternate Day</SelectItem><SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                                        <SelectItem value="fortnight" className="text-xs">Fortnight</SelectItem><SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                                        <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem><SelectItem value="yearly" className="text-xs">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1"><label className="text-xs font-bold uppercase text-muted-foreground">Start Date &amp; Time</label>
                                <Input type="datetime-local" value={createStartDate} onChange={(e) => setCreateStartDate(e.target.value)} className="h-9 text-xs" />
                            </div>
                        </div>
                        <div className="space-y-1"><label className="text-xs font-bold uppercase text-muted-foreground">Task Title &amp; Details</label>
                            <Textarea value={createTaskDesc} onChange={(e) => setCreateTaskDesc(e.target.value)} placeholder="Enter detailed task instructions..." className="min-h-[80px] text-xs" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="create-proof" checked={createRequireAttachment} onCheckedChange={(checked: boolean) => setCreateRequireAttachment(checked)} />
                            <label htmlFor="create-proof" className="text-xs font-semibold cursor-pointer">Require Doer Verification Proof</label>
                        </div>
                    </div>
                    <DialogFooter className="p-4 border-t bg-muted/10 gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleCreateTask} disabled={isCreating} className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
                            <Zap size={14} />{isCreating ? 'Creating Task...' : 'Publish Task'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
