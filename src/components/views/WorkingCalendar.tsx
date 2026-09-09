import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Trash, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import Heading from '../element/Heading';
import DataTable from '../element/DataTable';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Pill } from '../ui/pill';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { fetchWorkingDays, createWorkingDay, deleteWorkingDay, type WorkingDayRow } from '@/services/workingCalendarService';

function deriveDayAndWeek(dateStr: string): { day: string; week_num: number; month: number } {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString(undefined, { weekday: 'long' });
    const week_num = Math.ceil(d.getDate() / 7);
    const month = d.getMonth() + 1;
    return { day, week_num, month };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function WorkingCalendar() {
    const [rows, setRows] = useState<WorkingDayRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [workingDate, setWorkingDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<WorkingDayRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const data = await fetchWorkingDays();
            setRows(data.sort((a, b) => (a.working_date || '').localeCompare(b.working_date || '')));
        } catch (error) {
            console.error('Failed to fetch working calendar:', error);
            toast.error('Failed to load working calendar');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function handleAdd() {
        if (!workingDate) {
            toast.error('Please provide a date');
            return;
        }
        setSaving(true);
        try {
            const derived = deriveDayAndWeek(workingDate);
            await createWorkingDay({ working_date: workingDate, ...derived });
            toast.success('Working day added');
            setOpen(false);
            setWorkingDate('');
            load();
        } catch (error) {
            console.error('Error adding working day:', error);
            toast.error('Failed to add working day');
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        const targetId = deleteTarget.id;
        setDeleting(true);
        try {
            await deleteWorkingDay(targetId);
            toast.success('Working day deleted');
            setDeleteTarget(null);
            setRows(prev => prev.filter(r => r.id !== targetId));
            await load();
        } catch (error) {
            console.error('Error deleting working day:', error);
            toast.error('Failed to delete working day');
        } finally {
            setDeleting(false);
        }
    }

    const columns: ColumnDef<WorkingDayRow>[] = [
        {
            accessorKey: 'working_date',
            header: 'Date',
            cell: ({ row }) => row.original.working_date ? new Date(row.original.working_date).toLocaleDateString() : '—',
        },
        {
            accessorKey: 'day',
            header: 'Day',
        },
        {
            accessorKey: 'week_num',
            header: 'Week #',
        },
        {
            accessorKey: 'month',
            header: 'Month',
            cell: ({ row }) => {
                const m = row.original.month;
                return m ? MONTH_NAMES[m - 1] || m : '—';
            },
        },
        {
            id: 'status',
            header: 'Status',
            cell: () => <Pill variant="secondary">Working</Pill>,
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(row.original)}
                >
                    <Trash className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return (
        <div className="h-full space-y-6">
            <Dialog open={open} onOpenChange={setOpen}>
                <div className="relative space-y-3">
                    <Heading heading="Working Calendar" subtext="Manage official working days used for recurring task scheduling">
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-3 rounded-2xl shadow-lg text-white transform -rotate-12">
                            <Clock size={40} />
                        </div>
                    </Heading>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Working Day</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500" /> Holiday (see Holidays page)</span>
                    </div>

                    <div className="mt-4">
                        <DataTable
                            data={rows}
                            columns={columns}
                            searchFields={['day']}
                            dataLoading={loading}
                            extraActions={
                                <Button className="h-10 px-6 gap-2" onClick={() => setOpen(true)}>
                                    <Plus size={18} />
                                    <span className="hidden sm:inline">Add Working Day</span>
                                </Button>
                            }
                        />
                    </div>
                </div>

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Working Day</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Date</label>
                            <Input type="date" value={workingDate} onChange={(e) => setWorkingDate(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleAdd} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Working Day'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Working Day</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to remove{' '}
                        <span className="font-medium text-foreground">
                            {deleteTarget?.working_date ? new Date(deleteTarget.working_date).toLocaleDateString() : 'this entry'}
                        </span>{' '}
                        from the working calendar?
                    </p>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="gap-2">
                            <Trash className="size-4" />
                            {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
