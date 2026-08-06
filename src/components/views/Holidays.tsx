import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarOff, Trash, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import Heading from '../element/Heading';
import DataTable from '../element/DataTable';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { fetchHolidays, createHoliday, deleteHoliday, type HolidayRow } from '@/services/holidayService';

export default function Holidays() {
    const [rows, setRows] = useState<HolidayRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [holidayDate, setHolidayDate] = useState('');
    const [holidayName, setHolidayName] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<HolidayRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const data = await fetchHolidays();
            setRows(data.sort((a, b) => (a.holiday_date || '').localeCompare(b.holiday_date || '')));
        } catch (error) {
            console.error('Failed to fetch holidays:', error);
            toast.error('Failed to load holidays');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function handleAdd() {
        if (!holidayDate || !holidayName) {
            toast.error('Please provide both a date and a name');
            return;
        }
        setSaving(true);
        try {
            await createHoliday({ holiday_date: holidayDate, holiday_name: holidayName });
            toast.success('Holiday added');
            setHolidayDate('');
            setHolidayName('');
            load();
        } catch (error) {
            console.error('Error adding holiday:', error);
            toast.error('Failed to add holiday');
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteHoliday(deleteTarget.id);
            toast.success('Holiday deleted');
            setDeleteTarget(null);
            load();
        } catch (error) {
            console.error('Error deleting holiday:', error);
            toast.error('Failed to delete holiday');
        } finally {
            setDeleting(false);
        }
    }

    const columns: ColumnDef<HolidayRow>[] = [
        {
            accessorKey: 'holiday_date',
            header: 'Date',
            cell: ({ row }) => {
                if (!row.original.holiday_date) return '—';
                const d = new Date(row.original.holiday_date);
                return (
                    <div>
                        <p className="font-medium">{d.toLocaleDateString()}</p>
                        <p className="text-[11px] text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: 'long' })}</p>
                    </div>
                );
            },
        },
        {
            accessorKey: 'holiday_name',
            header: 'Holiday Name',
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
            <Heading heading="Holidays" subtext="Manage company holidays excluded from recurring task generation">
                <div className="bg-gradient-to-br from-rose-500 to-orange-500 p-3 rounded-2xl shadow-lg text-white transform -rotate-12">
                    <CalendarOff size={40} />
                </div>
            </Heading>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <Card className="border-t-4 border-t-rose-500 self-start">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Plus className="size-4 text-rose-500" /> Add Holiday
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Date</label>
                            <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Holiday Name</label>
                            <Input placeholder="e.g. Independence Day" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} />
                        </div>
                        <Button onClick={handleAdd} disabled={saving} className="w-full gap-2 bg-rose-500 hover:bg-rose-600">
                            <Plus className="size-4" />
                            {saving ? 'Saving...' : 'Save Holiday'}
                        </Button>
                    </CardContent>
                </Card>

                <DataTable
                    data={rows}
                    columns={columns}
                    searchFields={['holiday_name']}
                    dataLoading={loading}
                />
            </div>

            <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Holiday</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">{deleteTarget?.holiday_name}</span>? This action cannot be undone.
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
