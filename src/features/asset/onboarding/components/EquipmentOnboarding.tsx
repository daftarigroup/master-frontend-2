import { useEffect, useState } from 'react';
import { RefreshCw, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProject } from '@/context/ProjectContext';
import { apiClient } from '@/lib/apiClient';
import { formatDate } from '@/lib/utils';

interface Row {
    indent_item_id: number;
    equipment_name: string;
    equipment_type: string | null;
    expected_time: string | null;
    quantity: number;
    onboarded: number;
    pending: number;
    indent_number: string;
    po_number: string;
    po_date: string | null;
    vendor_name: string | null;
    project_name: string;
}

const TYPES = ['EXCAVATOR', 'BACKHOE_LOADER', 'LOADER', 'DOZER', 'GRADER', 'ROLLER', 'CRANE', 'TIPPER', 'TRUCK', 'TRANSIT_MIXER', 'WATER_TANKER', 'TRACTOR', 'CAR', 'CONCRETE_PUMP', 'BATCHING_PLANT', 'COMPRESSOR', 'WATER_PUMP', 'DG_SET', 'OTHER'];
const KM_TYPES = ['TIPPER', 'TRUCK', 'TRANSIT_MIXER', 'WATER_TANKER', 'CAR'];
const label = (v: string) => v.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
const selectClass = 'w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs';

const blankForm = () => ({
    firmId: '',
    registrationNo: '',
    equipmentType: 'OTHER',
    readingUnit: 'HOURS',
    openingReading: '',
    onboardedOn: new Date().toISOString().slice(0, 10),
    hireType: 'DRY',
    serialNumber: '',
    remarks: '',
});

export default function EquipmentOnboarding() {
    const { availableProjects } = useProject();
    const projects = availableProjects.filter((p) => p.id !== 'all');
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Row | null>(null);
    const [form, setForm] = useState(blankForm);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res: any = await apiClient.get('/pms/equipment-onboarding');
            setRows(res.data ?? []);
        } catch (err: any) {
            toast.error(err?.message || 'Could not load equipment');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);

    const set = (key: keyof ReturnType<typeof blankForm>, value: string) => setForm((f) => ({ ...f, [key]: value }));

    const open = (row: Row) => {
        const match = projects.find((p) => p.name.trim().toLowerCase() === row.project_name.trim().toLowerCase());
        setForm({ ...blankForm(), firmId: match ? String(match.id) : '' });
        setSelected(row);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        setSaving(true);
        try {
            await apiClient.post('/pms/equipment-onboarding', { ...form, indent_item_id: selected.indent_item_id });
            toast.success(`${selected.equipment_name} added to Equipment Master`);
            setSelected(null);
            load();
        } catch (err: any) {
            toast.error(err?.message || 'Onboarding failed');
        } finally {
            setSaving(false);
        }
    };

    const field = (title: string, control: React.ReactNode) => (
        <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-600">{title}</Label>
            {control}
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" /> Equipment Onboarding
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-1">Equipment with a PMS purchase order. Onboard it when it arrives to add it to the Equipment Master.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {['PO Number', 'PO Date', 'Indent', 'Project', 'Equipment', 'Type', 'Duration', 'Vendor', 'Onboarded', ''].map((h) => (
                                    <TableHead key={h} className="text-xs font-bold">{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-32 text-center text-xs text-slate-500">
                                        {loading ? 'Loading...' : 'No equipment purchase orders yet.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((r) => (
                                    <TableRow key={r.indent_item_id} className="text-xs">
                                        <TableCell className="font-semibold text-blue-700">{r.po_number}</TableCell>
                                        <TableCell>{r.po_date ? formatDate(r.po_date) : '-'}</TableCell>
                                        <TableCell>{r.indent_number}</TableCell>
                                        <TableCell>{r.project_name}</TableCell>
                                        <TableCell className="font-semibold">{r.equipment_name}</TableCell>
                                        <TableCell><Badge variant="outline">{r.equipment_type || '-'}</Badge></TableCell>
                                        <TableCell>{r.expected_time || '-'}</TableCell>
                                        <TableCell>{r.vendor_name || '-'}</TableCell>
                                        <TableCell>{r.onboarded} / {r.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {r.pending > 0 ? (
                                                <Button size="sm" onClick={() => open(r)}>Onboard</Button>
                                            ) : (
                                                <Badge variant="secondary">Done</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle>Onboard {selected?.equipment_name}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <form onSubmit={submit} className="space-y-4">
                            <p className="text-xs text-slate-500">
                                {selected.po_number} · {selected.project_name} · {selected.vendor_name || 'No vendor'} · unit {selected.onboarded + 1} of {selected.quantity}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {field('Project in Equipment Master *', (
                                    <select required className={selectClass} value={form.firmId} onChange={(e) => set('firmId', e.target.value)}>
                                        <option value="">Select project</option>
                                        {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                    </select>
                                ))}
                                {field('Vehicle / Registration No. *', <Input required value={form.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} />)}
                                {field('Equipment Type *', (
                                    <select
                                        className={selectClass}
                                        value={form.equipmentType}
                                        onChange={(e) => setForm((f) => ({ ...f, equipmentType: e.target.value, readingUnit: KM_TYPES.includes(e.target.value) ? 'KM' : 'HOURS' }))}
                                    >
                                        {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
                                    </select>
                                ))}
                                {field('Meter Type *', (
                                    <select className={selectClass} value={form.readingUnit} onChange={(e) => set('readingUnit', e.target.value)}>
                                        <option value="HOURS">Hours</option>
                                        <option value="KM">Kilometres</option>
                                        <option value="NONE">No meter</option>
                                    </select>
                                ))}
                                {field('Meter Reading at Onboarding *', <Input type="number" min="0" step="any" required value={form.openingReading} onChange={(e) => set('openingReading', e.target.value)} />)}
                                {field('Onboarding Date *', <Input type="date" required value={form.onboardedOn} onChange={(e) => set('onboardedOn', e.target.value)} />)}
                                {selected.equipment_type === 'Rent' && field('Hire Type', (
                                    <select className={selectClass} value={form.hireType} onChange={(e) => set('hireType', e.target.value)}>
                                        <option value="DRY">Dry (without fuel / operator)</option>
                                        <option value="WET">Wet (with fuel / operator)</option>
                                    </select>
                                ))}
                                {field('Chassis / Serial No.', <Input value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} />)}
                                {field('Remarks', <Input value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />)}
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add to Equipment Master'}</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
