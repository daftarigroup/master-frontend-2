import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
    ClipboardList,
    ClipboardCheck,
    User,
    UserCheck,
    ListChecks,
    CalendarClock,
    Bell,
    Repeat,
    AlertTriangle,
    Plus,
    Trash2,
    Send,
    Layers,
    UserX,
    Clock,
    Paperclip,
    Sparkles,
    Building2,
} from 'lucide-react';
import Heading from '@/components/element/Heading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select';
import { useAuth } from '@/context/AuthContext';
import { isChecklistAdmin } from '@/lib/roleAccess';
import { fetchUsers, type UserRecord } from '@/services/userService';
import { fetchMasterOptions } from '@/services/masterService';
import { assignTask, type ChecklistFrequency } from '@/services/checklistTaskService';
import { fetchHolidays, type HolidayRecord } from '@/services/holidayService';

const CHAR_MAX = 500;

export const FREQUENCY_OPTIONS: { value: ChecklistFrequency; label: string; isDelegation: boolean }[] = [
    { value: 'one-time', label: 'One-Time (Delegation)', isDelegation: true },
    { value: 'daily', label: 'Daily', isDelegation: false },
    { value: 'alternate-day', label: 'Alternate Day', isDelegation: false },
    { value: 'weekly', label: 'Weekly', isDelegation: false },
    { value: 'fortnight', label: 'Fortnightly', isDelegation: false },
    { value: 'monthly', label: 'Monthly', isDelegation: false },
    { value: 'quarterly', label: 'Quarterly', isDelegation: false },
    { value: 'half-yearly', label: 'Half-Yearly', isDelegation: false },
    { value: 'yearly', label: 'Yearly', isDelegation: false },
];

const DURATION_OPTIONS = [
    { value: '15 MIN', label: '15 Minutes' },
    { value: '30 MIN', label: '30 Minutes' },
    { value: '45 MIN', label: '45 Minutes' },
    { value: '1 HOUR', label: '1 Hour' },
    { value: '2 HOURS', label: '2 Hours' },
    { value: '4 HOURS', label: '4 Hours' },
    { value: '1 DAY', label: '1 Day' },
];

const schema = z.object({
    firm_id: z.string().min(1, 'Project / Firm is required'),
    given_by_id: z.string().min(1, 'Assign From is required'),
    doer_id: z.string().min(1, "Doer's Name is required"),
    task_description: z.string().min(1, 'Task Details are required').max(CHAR_MAX, `Max ${CHAR_MAX} characters allowed`),
    frequency: z.string().min(1, 'Frequency is required'),
    task_start_date: z.string().min(1, 'Start Date & Time is required'),
    duration: z.string().optional(),
    priority: z.enum(['P1', 'P2', 'P3']),
    require_attachment: z.boolean(),
    enable_reminder: z.boolean(),
    reminder_days_before: z.string().optional(),
    remark: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface DraftTaskItem {
    id: string;
    firm_id: number;
    firm_name: string;
    given_by_id: number | null;
    given_by_name: string | null;
    doer_id: number;
    doer_name: string;
    task_description: string;
    frequency: ChecklistFrequency;
    task_start_date: string;
    duration: string | null;
    require_attachment: boolean;
    enable_reminder: boolean;
    reminder_days_before: number | null;
    remark: string | null;
}

export default function AssignTask() {
    const { user } = useAuth();
    const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
    const [doers, setDoers] = useState<UserRecord[]>([]);
    const [firmOptions, setFirmOptions] = useState<{ id: number; name: string }[]>([]);
    const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);

    // Draft Queue State
    const [draftQueue, setDraftQueue] = useState<DraftTaskItem[]>([]);
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            firm_id: '',
            given_by_id: String(user?.id || ''),
            doer_id: '',
            task_description: '',
            frequency: 'one-time',
            task_start_date: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
            duration: '30 MIN',
            priority: 'P2',
            require_attachment: false,
            enable_reminder: false,
            reminder_days_before: '1',
            remark: '',
        },
    });

    // Update given_by_id default when user loads
    useEffect(() => {
        if (user?.id && !form.getValues('given_by_id')) {
            form.setValue('given_by_id', String(user.id));
        }
    }, [user, form]);

    const permittedFirms = useMemo(() => {
        if (user?.role === 'SUPER_ADMIN' || !user?.firm_access?.length) return firmOptions;
        return firmOptions.filter((f) => user.firm_access.includes(String(f.id)) || user.firm_access.includes(f.name));
    }, [firmOptions, user?.firm_access, user?.role]);

    useEffect(() => {
        Promise.all([
            fetchUsers(),
            fetchMasterOptions(user?.role === 'SUPER_ADMIN' ? undefined : user?.firm_access),
            fetchHolidays(),
        ])
            .then(([users, masterOptions, hList]) => {
                setAllUsers(users);
                setDoers(users.filter((u) => u.role === 'USER' || !u.role));
                setFirmOptions(masterOptions.firmObjects || []);
                setHolidays(hList || []);
            })
            .catch((error) => {
                console.error('Failed to load assign task options:', error);
                toast.error('Failed to load options');
            })
            .finally(() => setLoadingOptions(false));
    }, [user?.role, user?.firm_access]);

    const watchedDescription = form.watch('task_description') || '';
    const watchedDoerId = form.watch('doer_id');
    const watchedStartDate = form.watch('task_start_date');
    const watchedFrequency = form.watch('frequency');
    const watchedEnableReminder = form.watch('enable_reminder');

    const isDelegation = watchedFrequency === 'one-time';

    // Searchable Select Options formatting
    const projectOptions: SearchableOption[] = useMemo(() => {
        return permittedFirms.map((f) => ({
            value: String(f.id),
            label: f.name,
        }));
    }, [permittedFirms]);

    const assignFromOptions: SearchableOption[] = useMemo(() => {
        return allUsers.map((u) => ({
            value: String(u.id || u.rowIndex),
            label: u.name || u.username,
            sublabel: u.role || 'User',
        }));
    }, [allUsers]);

    const doerOptions: SearchableOption[] = useMemo(() => {
        return doers.map((d) => ({
            value: String(d.id || d.rowIndex),
            label: d.name || d.username,
            sublabel: d.day_off ? `Day Off: ${d.day_off}` : undefined,
        }));
    }, [doers]);

    // Leave / Day-Off Conflict Check
    const leaveConflict = useMemo(() => {
        if (!watchedDoerId || !watchedStartDate) return null;
        const doer = doers.find((d) => String(d.id || d.rowIndex) === watchedDoerId);
        if (!doer) return null;

        const targetDate = new Date(watchedStartDate);
        if (isNaN(targetDate.getTime())) return null;

        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
        if (doer.day_off && doer.day_off.toLowerCase().includes(dayName.toLowerCase())) {
            return `${doer.name} is scheduled on Day-Off (${dayName})`;
        }

        const dateStr = targetDate.toISOString().split('T')[0];
        const hol = holidays.find((h) => h.holiday_date.startsWith(dateStr));
        if (hol) {
            return `Selected date is a public holiday (${hol.holiday_name})`;
        }

        return null;
    }, [watchedDoerId, watchedStartDate, doers, holidays]);

    if (!isChecklistAdmin(user)) {
        return <Navigate to="/checklist/dashboard" replace />;
    }

    function addCurrentToQueue(values: FormValues) {
        const firm = firmOptions.find((f) => String(f.id) === values.firm_id);
        const doer = doers.find((d) => String(d.id || d.rowIndex) === values.doer_id);
        const assigner = allUsers.find((u) => String(u.id || u.rowIndex) === values.given_by_id) || user;

        if (!firm || !doer) {
            toast.error('Please select a valid project and doer');
            return;
        }

        const newItem: DraftTaskItem = {
            id: Math.random().toString(36).substring(2, 9),
            firm_id: Number(firm.id),
            firm_name: firm.name,
            given_by_id: assigner?.id ? Number(assigner.id) : null,
            given_by_name: assigner?.name || assigner?.username || null,
            doer_id: Number(doer.id || doer.rowIndex),
            doer_name: doer.name,
            task_description: `[${values.priority}] ${values.task_description}`,
            frequency: values.frequency as ChecklistFrequency,
            task_start_date: new Date(values.task_start_date).toISOString(),
            duration: values.duration || null,
            require_attachment: values.require_attachment ?? false,
            enable_reminder: values.frequency !== 'one-time' ? (values.enable_reminder ?? false) : false,
            reminder_days_before: values.frequency !== 'one-time' && values.enable_reminder ? Number(values.reminder_days_before) || 1 : 1,
            remark: values.remark || null,
        };

        setDraftQueue((prev) => [...prev, newItem]);
        toast.success(`Task added to Draft Queue (${draftQueue.length + 1} queued)`);
        form.reset({
            firm_id: values.firm_id,
            given_by_id: values.given_by_id,
            doer_id: '',
            task_description: '',
            frequency: values.frequency,
            task_start_date: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
            duration: '30 MIN',
            priority: 'P2',
            require_attachment: false,
            enable_reminder: false,
            reminder_days_before: '1',
            remark: '',
        });
    }

    async function submitSingleOrBatch(values: FormValues) {
        const firm = firmOptions.find((f) => String(f.id) === values.firm_id);
        const doer = doers.find((d) => String(d.id || d.rowIndex) === values.doer_id);
        const assigner = allUsers.find((u) => String(u.id || u.rowIndex) === values.given_by_id) || user;

        if (!firm || !doer) {
            toast.error('Please select a valid project and doer');
            return;
        }

        try {
            const result = await assignTask({
                firm_id: Number(firm.id),
                firm_name: firm.name,
                doer_id: Number(doer.id || doer.rowIndex),
                doer_name: doer.name,
                given_by_id: assigner?.id ? Number(assigner.id) : null,
                given_by_name: assigner?.name || assigner?.username || null,
                task_description: `[${values.priority}] ${values.task_description}`,
                frequency: values.frequency as ChecklistFrequency,
                task_start_date: new Date(values.task_start_date).toISOString(),
                duration: values.duration || null,
                require_attachment: values.require_attachment ?? false,
                enable_reminder: values.frequency !== 'one-time' ? (values.enable_reminder ?? false) : false,
                reminder_days_before: values.frequency !== 'one-time' && values.enable_reminder ? Number(values.reminder_days_before) || 1 : 1,
                remark: values.remark || null,
            });

            toast.success(
                result?.type === 'checklist'
                    ? `Checklist generated (${result.count || 0} occurrences)`
                    : 'Delegation task assigned successfully'
            );

            form.reset({
                firm_id: values.firm_id,
                given_by_id: values.given_by_id,
                doer_id: '',
                task_description: '',
                frequency: values.frequency,
                task_start_date: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
                duration: '30 MIN',
                priority: 'P2',
                require_attachment: false,
                enable_reminder: false,
                reminder_days_before: '1',
                remark: '',
            });
        } catch (error) {
            console.error('Error assigning task:', error);
            toast.error('Failed to assign task');
        }
    }

    async function processBatchSubmit() {
        if (draftQueue.length === 0) return;
        setIsSubmittingBatch(true);
        try {
            for (const item of draftQueue) {
                await assignTask({
                    firm_id: item.firm_id,
                    firm_name: item.firm_name,
                    doer_id: item.doer_id,
                    doer_name: item.doer_name,
                    given_by_id: item.given_by_id ? Number(item.given_by_id) : null,
                    given_by_name: item.given_by_name || null,
                    task_description: item.task_description,
                    frequency: item.frequency,
                    task_start_date: item.task_start_date,
                    duration: item.duration,
                    require_attachment: item.require_attachment,
                    enable_reminder: item.enable_reminder,
                    reminder_days_before: item.reminder_days_before,
                    remark: item.remark,
                });
            }
            toast.success(`All ${draftQueue.length} queued tasks assigned successfully!`);
            setDraftQueue([]);
        } catch (err) {
            console.error('Batch submit error:', err);
            toast.error('Failed to publish all draft tasks');
        } finally {
            setIsSubmittingBatch(false);
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto py-2 space-y-4">
            {/* Header & Draft Queue Trigger Bar */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                        <span>Assign Task</span>
                        <Sparkles className="size-4 text-amber-500 animate-pulse" />
                    </h1>
                    <p className="text-xs text-muted-foreground">Configure one-time delegation or recurring checklist tasks</p>
                </div>

                {/* Floating Draft Queue Trigger */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 text-xs relative bg-card shadow-2xs">
                            <Layers size={14} className="text-purple-600" />
                            <span className="hidden sm:inline">Draft Queue</span>
                            {draftQueue.length > 0 && (
                                <span className="size-5 rounded-full bg-purple-600 text-white font-extrabold text-[10px] flex items-center justify-center">
                                    {draftQueue.length}
                                </span>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[85vw] max-w-[380px] sm:w-[420px] sm:max-w-[420px]">
                        <SheetHeader className="pb-3 border-b">
                            <SheetTitle className="text-base font-bold flex items-center gap-2">
                                <Layers size={18} className="text-purple-600" />
                                Queued Tasks ({draftQueue.length})
                            </SheetTitle>
                        </SheetHeader>
                        <div className="py-4 space-y-3 max-h-[75vh] overflow-y-auto">
                            {draftQueue.length > 0 ? (
                                draftQueue.map((item, idx) => (
                                    <div key={item.id} className="p-3 bg-muted/40 rounded-lg border text-xs relative space-y-1">
                                        <div className="flex items-center justify-between font-bold text-foreground">
                                            <span className="truncate pr-4">#{idx + 1} {item.task_description}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-6 text-red-500 hover:bg-red-50"
                                                onClick={() => setDraftQueue((q) => q.filter((i) => i.id !== item.id))}
                                            >
                                                <Trash2 size={13} />
                                            </Button>
                                        </div>
                                        <p className="text-muted-foreground">{item.doer_name} • {item.firm_name}</p>
                                        <span className="inline-block font-bold text-purple-600 uppercase text-[10px]">
                                            {item.frequency}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground italic text-center py-10">Draft queue is currently empty</p>
                            )}
                        </div>
                        {draftQueue.length > 0 && (
                            <Button
                                onClick={processBatchSubmit}
                                disabled={isSubmittingBatch}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 mt-2"
                            >
                                <Send size={14} />
                                {isSubmittingBatch ? 'Publishing Batch...' : `Publish All (${draftQueue.length})`}
                            </Button>
                        )}
                    </SheetContent>
                </Sheet>
            </div>

            {/* Form Card - Portrait Form Layout Centered */}
            <Card className="w-full max-w-2xl shadow-md border-t-4 transition-all duration-300 border-t-sky-600 dark:border-t-sky-500 bg-card">
                <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            {isDelegation ? (
                                <>
                                    <ClipboardCheck className="size-5 text-violet-600" />
                                    <span>Task Configurator</span>
                                </>
                            ) : (
                                <>
                                    <ClipboardList className="size-5 text-sky-600" />
                                    <span>Task Configurator</span>
                                </>
                            )}
                        </CardTitle>

                        {/* Mode Indicator Badge */}
                        <div
                            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                isDelegation
                                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                                    : 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            }`}
                        >
                            {isDelegation ? (
                                <>
                                    <ClipboardCheck size={13} />
                                    <span>Delegation Task (One-Time)</span>
                                </>
                            ) : (
                                <>
                                    <Repeat size={13} />
                                    <span>Checklist Task (Recurring)</span>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <Form {...form}>
                        <form className="space-y-5">
                            {/* Leave Conflict Warning Badge */}
                            {leaveConflict && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
                                    <UserX size={16} className="shrink-0" />
                                    <span>{leaveConflict}</span>
                                </div>
                            )}

                            {/* ROW 1: Project (Dropdown + Search) & Assign From (Dropdown + Search) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firm_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Building2 className="size-3.5 text-muted-foreground" />
                                                <span>Project</span>
                                            </FormLabel>
                                            <FormControl>
                                                <SearchableSelect
                                                    options={projectOptions}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder={loadingOptions ? 'Loading projects...' : 'Select project'}
                                                    searchPlaceholder="Search project..."
                                                    emptyText="No matching project found"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="given_by_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <UserCheck className="size-3.5 text-muted-foreground" />
                                                <span>Assign From</span>
                                            </FormLabel>
                                            <FormControl>
                                                <SearchableSelect
                                                    options={assignFromOptions}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder={loadingOptions ? 'Loading users...' : 'Select assigner'}
                                                    searchPlaceholder="Search assigner..."
                                                    emptyText="No matching user found"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* ROW 2: Doer's Name (Dropdown) */}
                            <FormField
                                control={form.control}
                                name="doer_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <User className="size-3.5 text-muted-foreground" />
                                            <span>Doer's Name</span>
                                        </FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={doerOptions}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                placeholder={loadingOptions ? 'Loading doers...' : 'Select doer'}
                                                searchPlaceholder="Search doer by name..."
                                                emptyText="No matching doer found"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* ROW 3: Task Details (Large Textarea) */}
                            <FormField
                                control={form.control}
                                name="task_description"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center">
                                            <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <ListChecks className="size-3.5 text-muted-foreground" />
                                                <span>Task Details</span>
                                            </FormLabel>
                                            <span className={`text-[11px] font-bold ${watchedDescription.length > 450 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                {watchedDescription.length} / {CHAR_MAX}
                                            </span>
                                        </div>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter full task details and instructions..."
                                                className="min-h-[110px] text-xs resize-y"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Priority Selection Pills */}
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-foreground">Priority Level</FormLabel>
                                        <div className="flex items-center gap-2">
                                            {(['P1', 'P2', 'P3'] as const).map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => field.onChange(p)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                                                        field.value === p
                                                            ? p === 'P1'
                                                                ? 'bg-red-500 text-white border-red-500 shadow-2xs'
                                                                : p === 'P2'
                                                                ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                                                : 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                                                            : 'bg-muted/30 hover:bg-muted text-muted-foreground border-slate-200 dark:border-slate-800'
                                                    }`}
                                                >
                                                    {p === 'P1' ? 'P1 - Urgent' : p === 'P2' ? 'P2 - Normal' : 'P3 - Low'}
                                                </button>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* ROW 4: Frequency & Start Date & Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="frequency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Repeat className="size-3.5 text-muted-foreground" />
                                                <span>Frequency</span>
                                            </FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue placeholder="Select frequency" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {FREQUENCY_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                            <div className="flex items-center justify-between w-full gap-2">
                                                                <span>{opt.label}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="task_start_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <CalendarClock className="size-3.5 text-muted-foreground" />
                                                <span>{isDelegation ? 'Due Date & Time' : 'Start Date & Time'}</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" className="h-9 text-xs" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* ROW 5: Duration */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="duration"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Clock className="size-3.5 text-muted-foreground" />
                                                <span>Estimated Duration</span>
                                            </FormLabel>
                                            <Select value={field.value || ''} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue placeholder="Select duration" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {DURATION_OPTIONS.map((d) => (
                                                        <SelectItem key={d.value} value={d.value} className="text-xs">
                                                            {d.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {!isDelegation && watchedEnableReminder && (
                                    <FormField
                                        control={form.control}
                                        name="reminder_days_before"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Bell className="size-3.5 text-muted-foreground" />
                                                    <span>Reminder Advance</span>
                                                </FormLabel>
                                                <Select value={field.value || '1'} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 text-xs">
                                                            <SelectValue placeholder="Select reminder days" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="1" className="text-xs">1 Day Before</SelectItem>
                                                        <SelectItem value="2" className="text-xs">2 Days Before</SelectItem>
                                                        <SelectItem value="3" className="text-xs">3 Days Before</SelectItem>
                                                        <SelectItem value="7" className="text-xs">1 Week Before</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            {/* ROW 6: Toggle Switches (Enable Reminder & Require Attachment) */}
                            <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-4">
                                <FormField
                                    control={form.control}
                                    name="enable_reminder"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-3 space-y-0">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    disabled={isDelegation}
                                                />
                                            </FormControl>
                                            <div>
                                                <FormLabel className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1">
                                                    <Bell className="size-3.5 text-sky-600" />
                                                    <span>Enable Reminder</span>
                                                </FormLabel>
                                                {isDelegation && (
                                                    <p className="text-[10px] text-muted-foreground">N/A for one-time delegation</p>
                                                )}
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="require_attachment"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-3 space-y-0">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1">
                                                <Paperclip className="size-3.5 text-violet-600" />
                                                <span>Require Attachment</span>
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Form Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                                <Button
                                    type="button"
                                    size="lg"
                                    className={`flex-1 gap-2 text-white font-bold transition-colors ${
                                        isDelegation ? 'bg-violet-600 hover:bg-violet-700' : 'bg-sky-600 hover:bg-sky-700'
                                    }`}
                                    onClick={form.handleSubmit(submitSingleOrBatch)}
                                    disabled={form.formState.isSubmitting}
                                >
                                    <Send size={15} />
                                    {form.formState.isSubmitting ? 'Assigning Task...' : isDelegation ? 'Assign Delegation Task' : 'Assign Checklist Task'}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/40"
                                    onClick={form.handleSubmit(addCurrentToQueue)}
                                >
                                    <Plus size={15} />
                                    Queue in Drafts
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
