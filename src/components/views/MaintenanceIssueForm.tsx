import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { ClipLoader as Loader } from 'react-spinners';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { apiClient } from '@/lib/apiClient';
import { usePickerMachines } from '@/features/asset/worklogs/server/useWorkLogQueries';
import { fetchWorkOrderList, type PartLine, type WorkOrderRow } from '@/features/maintenancepro/work_orders/server/api/workOrdersApi';
import { api } from '@/lib/axios';
import { createIssueRecords } from '@/services/issueService';

interface Firm {
    id: number;
    name: string;
}

interface Props {
    /** projects this user may issue for (already filtered by firm access) */
    firms: Firm[];
    defaultFirmId?: number;
    /** deep link from a work order ("Issue from Store"): pre-selects its project, machine and work order */
    initialWorkOrderId?: string;
    userName?: string;
    onCreated: () => void;
}

interface StockRow {
    current: number;
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/**
 * Store Issue, order type "Maintenance & repair": machine parts issued from the project's Store to a repair work order of a machine.
 * The work order lists the parts it needs (and the indent was raised from it); here the Store issues them, line by line.
 * Nothing counts as issued on the work order until Store Data approves the issue (the approved quantity is what counts). The
 * server repeats every check: the part must be on that work order, within what it still needs, and in the project's stock.
 */
export function MaintenanceIssueForm({ firms, defaultFirmId, initialWorkOrderId, userName, onCreated }: Props) {
    const qc = useQueryClient();
    const [machineId, setMachineId] = useState('');
    const [workOrderId, setWorkOrderId] = useState(initialWorkOrderId ?? '');
    const [qty, setQty] = useState<Record<string, string>>({});
    const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
    const [issuer, setIssuer] = useState(userName ?? '');
    const [remarks, setRemarks] = useState('');
    const [busy, setBusy] = useState(false);

    // deep link: pre-select machine and work order
    const linkedQ = useQuery({
        queryKey: ['maintenance', 'work-orders', 'issue-link', initialWorkOrderId],
        enabled: !!initialWorkOrderId,
        queryFn: async () => (await api.get(`/maintenance/work-orders/${initialWorkOrderId}`)).data.data as WorkOrderRow,
    });
    useEffect(() => {
        const wo = linkedQ.data;
        if (!wo) return;
        setMachineId(wo.machineId);
        setWorkOrderId(wo.id);
    }, [linkedQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

    const machinesQ = usePickerMachines(defaultFirmId !== undefined ? String(defaultFirmId) : undefined);
    const machines = useMemo(() => machinesQ.data ?? [], [machinesQ.data]);
    const selectedMachine = useMemo(() => machines.find((m) => m.id === machineId), [machines, machineId]);

    const derivedFirmId = useMemo(() => {
        if (selectedMachine?.firmId) return Number(selectedMachine.firmId);
        return defaultFirmId;
    }, [selectedMachine, defaultFirmId]);

    const firmName = useMemo(() => {
        if (selectedMachine?.firmName) return selectedMachine.firmName;
        if (derivedFirmId !== undefined) return firms.find((f) => f.id === derivedFirmId)?.name ?? '';
        return '';
    }, [selectedMachine, derivedFirmId, firms]);

    // repair work orders of the machine that are still waiting for parts
    const ordersQ = useQuery({
        queryKey: ['maintenance', 'work-orders', 'waiting-parts', machineId],
        enabled: !!machineId,
        queryFn: async () => (await fetchWorkOrderList({ machineId, waitingParts: true, limit: 50 })).data,
    });
    const rawOrders = ordersQ.data ?? [];
    const linkedOrder = linkedQ.data;

    const orders = useMemo(() => {
        const list = rawOrders.filter((w) => (w.parts?.lines ?? []).some((l) => (l.open !== undefined ? l.open > 0 : l.remaining > 0)));
        // If a work order is currently selected (e.g. from deep-link or manual selection), ensure it is always in options so its label renders
        const current = (workOrderId ? rawOrders.find((w) => w.id === workOrderId) : undefined)
            ?? (linkedOrder && linkedOrder.id === workOrderId ? linkedOrder : undefined);
        if (current && !list.some((w) => w.id === current.id)) {
            return [current, ...list];
        }
        return list;
    }, [rawOrders, linkedOrder, workOrderId]);

    const order = useMemo(() => {
        return orders.find((w) => w.id === workOrderId)
            ?? rawOrders.find((w) => w.id === workOrderId)
            ?? (linkedOrder?.id === workOrderId ? linkedOrder : undefined);
    }, [orders, rawOrders, linkedOrder, workOrderId]);

    const lines: PartLine[] = useMemo(() => {
        const allLines = order?.parts?.lines ?? [];
        const unissued = allLines.filter((l) => l.remaining > 0);
        return unissued.length > 0 ? unissued : allLines;
    }, [order]);

    // the project's Store stock of each part
    const stockQs = useQueries({
        queries: lines.map((l) => ({
            queryKey: ['store-stock', derivedFirmId, l.itemName, l.groupHead],
            enabled: derivedFirmId !== undefined,
            queryFn: async () => {
                const res: any = await apiClient.get('/store/inventory/stock', { params: { firmId: derivedFirmId, item: l.itemName, groupHead: l.groupHead } });
                return (res.data ?? []) as StockRow[];
            },
        })),
    });
    const stockOf = (i: number): number | null => (stockQs[i]?.isSuccess ? (stockQs[i].data?.[0]?.current ?? 0) : null);

    // default quantity per part: what is still open to issue, capped by project Store stock
    useEffect(() => {
        setQty((prev) => {
            const next: Record<string, string> = {};
            lines.forEach((l, i) => {
                const stock = stockOf(i);
                const openQty = l.open ?? l.remaining;
                if (openQty <= 0) {
                    next[l.id] = '0';
                } else {
                    next[l.id] = prev[l.id] ?? fmt(stock === null ? openQty : Math.max(0, Math.min(openQty, stock)));
                }
            });
            return next;
        });
    }, [lines.map((l) => `${l.id}-${l.open ?? l.remaining}-${l.pending ?? 0}`).join(','), stockQs.map((q) => q.dataUpdatedAt).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    const picks = lines
        .map((l, i) => ({ line: l, stock: stockOf(i), q: Number(qty[l.id] ?? '') }))
        .filter((p) => p.q > 0 && (p.line.open ?? p.line.remaining) > 0);

    const problems: string[] = [];
    if (!machineId) problems.push('Choose the machine.');
    else if (derivedFirmId === undefined) problems.push('The selected machine does not have an assigned project.');
    if (!workOrderId) problems.push('Choose the work order.');
    if (workOrderId && picks.length === 0) {
        const anyOpen = lines.some((l) => (l.open ?? l.remaining) > 0);
        if (anyOpen) {
            problems.push('Enter the quantity to issue for at least one part.');
        } else {
            problems.push('All parts for this work order are already issued or pending approval.');
        }
    }
    for (const p of picks) {
        const openQty = p.line.open ?? p.line.remaining;
        if (p.q > openQty + 0.0005) {
            problems.push(`${p.line.itemName}: only ${fmt(openQty)} ${p.line.uom ?? ''} open to issue (${fmt(p.line.pending ?? 0)} pending approval).`);
        }
        if (p.stock !== null && p.q > p.stock) {
            problems.push(`${p.line.itemName}: only ${fmt(p.stock)} in this project's Store.`);
        }
    }
    if (!date) problems.push('Pick the date.');

    async function submit() {
        if (problems.length > 0) {
            toast.error(problems[0]);
            return;
        }
        setBusy(true);
        try {
            await createIssueRecords(
                picks.map(
                    (p) =>
                        ({
                            timestamp: new Date().toISOString(),
                            uom: p.line.uom ?? 'NOS',
                            group_head: p.line.groupHead,
                            product_name: p.line.itemName,
                            quantity: p.q,
                            firm_name: firmName,
                            firm_id: derivedFirmId,
                            planned1: date,
                            issue_to: remarks.trim() || order?.workOrderCode || undefined,
                            issue_person_name: issuer.trim() || undefined,
                            issue_kind: 'MAINTENANCE',
                            machine_id: machineId,
                            work_order_id: workOrderId,
                            requirement_id: p.line.id,
                        }) as any,
                ),
            );
            toast.success('Parts issue created. It counts on the work order when Store Data approves it.');

            // Check if all lines for this work order are now submitted
            const allSubmitted = lines.every((l) => {
                const pick = picks.find((p) => p.line.id === l.id);
                const currentOpen = l.open ?? l.remaining;
                const issuedNow = pick ? pick.q : 0;
                return (currentOpen - issuedNow) <= 0.0005;
            });

            if (allSubmitted) {
                // Clear entire form when all items are issued/submitted for approval
                setMachineId('');
                setWorkOrderId('');
                setQty({});
                setRemarks('');
            } else {
                // Partial issue: clear only quantities and remarks, keep machine and work order
                setQty({});
                setRemarks('');
            }

            void qc.invalidateQueries({ queryKey: ['store-stock'] });
            void qc.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
            onCreated();
        } catch (e: any) {
            console.error('Error creating maintenance issue:', e);
            toast.error(e?.response?.data?.message || (e instanceof Error && e.message ? e.message : 'Could not create the parts issue'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6 pb-10">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Parts to a repair work order</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Machine <span className="text-destructive">*</span></Label>
                            <SearchableSelect
                                options={machines.map((m) => {
                                    const fName = m.firmName || firms.find((f) => String(f.id) === String(m.firmId))?.name;
                                    const subparts = [m.assetCode, fName].filter(Boolean);
                                    return {
                                        value: m.id,
                                        label: m.name,
                                        sublabel: subparts.join(' · '),
                                        keywords: [m.assetCode ?? '', m.registrationNo ?? '', fName ?? ''],
                                    };
                                })}
                                value={machineId}
                                onValueChange={(v) => {
                                    setMachineId(v);
                                    setWorkOrderId('');
                                }}
                                placeholder={machinesQ.isLoading ? 'Loading machines…' : 'Select machine'}
                                searchPlaceholder="Search name, code or project"
                                emptyText="No machine found"
                                disabled={machinesQ.isLoading}
                                className="h-11 w-full"
                            />
                            {selectedMachine && firmName && (
                                <p className="text-xs text-slate-500 font-medium">
                                    Project: <span className="text-slate-700 font-semibold">{firmName}</span>
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Work order <span className="text-destructive">*</span></Label>
                            <SearchableSelect
                                options={orders.map((w) => {
                                    const wLines = w.parts?.lines ?? [];
                                    const pendingCount = wLines.filter((l) => (l.pending ?? 0) > 0).length;
                                    let sublabel = `${w.parts?.complete ?? 0} of ${w.parts?.total ?? 0} parts issued`;
                                    if (pendingCount > 0) {
                                        sublabel += ` · ${pendingCount} pending approval`;
                                    }
                                    const code = w.workOrderCode ?? w.id.slice(0, 8);
                                    const title = w.title ?? (w as any).plan?.title ?? '';
                                    return {
                                        value: w.id,
                                        label: title ? `${code} · ${title}` : code,
                                        sublabel,
                                    };
                                })}
                                value={workOrderId}
                                onValueChange={setWorkOrderId}
                                placeholder={!machineId ? 'Choose the machine first' : ordersQ.isLoading ? 'Loading…' : orders.length === 0 ? 'No work order is waiting for parts' : 'Select work order'}
                                searchPlaceholder="Search work order"
                                emptyText="No work order is waiting for parts"
                                disabled={!machineId}
                                className="h-11 w-full"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Issue date <span className="text-destructive">*</span></Label>
                            <Input type="date" value={date} max={new Date().toLocaleDateString('en-CA')} onChange={(e) => setDate(e.target.value)} className="h-11" />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Issued by</Label>
                            <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Name" className="h-11" />
                        </div>
                    </div>

                    {order && (
                        <div className="space-y-2">
                            <Label className="text-slate-600 font-semibold">Parts the work order still needs</Label>
                            <div className="divide-y rounded-lg border border-slate-200 overflow-hidden">
                                {lines.map((l, i) => {
                                    const stock = stockOf(i);
                                    const q = Number(qty[l.id] ?? '');
                                    const openQty = l.open ?? l.remaining;
                                    const isFullySubmitted = openQty <= 0.0005;
                                    const isPartialIssued = l.issued > 0;
                                    const hasPending = (l.pending ?? 0) > 0;

                                    return (
                                        <div
                                            key={l.id}
                                            className={`grid grid-cols-1 sm:grid-cols-[1fr_auto_9rem] items-center gap-3 p-3 transition-colors ${
                                                isFullySubmitted ? 'bg-slate-50/75' : 'bg-white'
                                            }`}
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="truncate text-sm font-semibold text-slate-800">{l.itemName}</span>
                                                    {isPartialIssued && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                            Partially issued: {fmt(l.issued)}/{fmt(l.quantity)} {l.uom ?? ''}
                                                        </span>
                                                    )}
                                                    {hasPending && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                            {fmt(l.pending ?? 0)} {l.uom ?? ''} pending approval
                                                        </span>
                                                    )}
                                                    {isFullySubmitted && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            All submitted
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
                                                    <span>{l.groupHead}</span>
                                                    <span>·</span>
                                                    <span>Total: {fmt(l.quantity)} {l.uom ?? ''}</span>
                                                    <span>·</span>
                                                    <span className={openQty > 0 ? 'font-semibold text-slate-700' : 'text-slate-400'}>
                                                        Open to issue: {fmt(openQty)} {l.uom ?? ''}
                                                    </span>
                                                    {l.indentNumber && (
                                                        <>
                                                            <span>·</span>
                                                            <span>Indent: {l.indentNumber}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`text-xs font-semibold ${stock !== null && stock <= 0 ? 'text-destructive' : 'text-slate-500'}`}>
                                                {stock === null ? 'Checking stock…' : `Store stock: ${fmt(stock)} ${l.uom ?? ''}`}
                                            </div>
                                            <div>
                                                {isFullySubmitted ? (
                                                    <div className="h-10 flex items-center justify-center rounded border border-dashed border-slate-300 bg-slate-100 text-xs font-medium text-slate-500">
                                                        Submitted
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Input
                                                            type="number"
                                                            inputMode="decimal"
                                                            min={0}
                                                            max={openQty}
                                                            step="0.001"
                                                            value={qty[l.id] ?? ''}
                                                            onChange={(e) => setQty((p) => ({ ...p, [l.id]: e.target.value }))}
                                                            aria-label={`Quantity of ${l.itemName} to issue`}
                                                            className="h-10"
                                                        />
                                                        {stock !== null && q > stock && (
                                                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive">
                                                                <AlertTriangle className="size-3" /> More than Store holds
                                                            </p>
                                                        )}
                                                        {q > openQty + 0.0005 && (
                                                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive">
                                                                <AlertTriangle className="size-3" /> Exceeds open qty ({fmt(openQty)})
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500">Leave a quantity at 0 to issue nothing of that part now.</p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-slate-600 font-semibold">Remarks</Label>
                        <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} maxLength={500} />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                {problems.length > 0 && (machineId !== '' || picks.length > 0) && (
                    <ul className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 space-y-0.5">
                        {problems.map((p) => (
                            <li key={p}>{p}</li>
                        ))}
                    </ul>
                )}
                <Button
                    type="button"
                    className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200/50 transition-all active:scale-[0.98]"
                    disabled={busy || problems.length > 0}
                    onClick={() => void submit()}
                >
                    {busy ? <Loader size={20} color="white" /> : (<><Wrench className="mr-2 size-4" /> Submit parts issue</>)}
                </Button>
            </div>
        </div>
    );
}

export default MaintenanceIssueForm;
