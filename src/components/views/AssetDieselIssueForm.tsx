import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Fuel, MapPin, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ClipLoader as Loader } from 'react-spinners';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/apiClient';
import { usePickerMachines } from '@/features/asset/worklogs/server/useWorkLogQueries';
import { useOperatorRows } from '@/features/maintenancepro/assignments/server/useAssignmentQueries';
import { useSiteLocationsList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { createIssueRecords } from '@/services/issueService';
import type { MasterData } from '@/services/masterService';

interface Firm {
    id: number;
    name: string;
}

interface Props {
    options: MasterData | null;
    /** projects this user may issue for (already filtered by firm access) */
    firms: Firm[];
    defaultFirmId?: number;
    userName?: string;
    onCreated: () => void;
}

interface StockRow {
    firmId: string | null;
    itemName: string;
    groupHead: string;
    current: number;
}

const DIESEL = 'DIESEL';

/**
 * Store Issue, order type "Asset": diesel issue request to a machine.
 * Fields: machine name, site location, receiver name (operator fetched from maintenance assignments), qty (LTR), issued by, remarks.
 * Sends the request to Store Data for approval.
 */
export function AssetDieselIssueForm({ options, firms, defaultFirmId, userName, onCreated }: Props) {
    const qc = useQueryClient();
    const [machineId, setMachineId] = useState('');
    const [siteLocation, setSiteLocation] = useState('');
    const [receiver, setReceiver] = useState('');
    const [product, setProduct] = useState('');
    const [litres, setLitres] = useState('');
    const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
    const [issuer, setIssuer] = useState(userName ?? '');
    const [remarks, setRemarks] = useState('');
    const [busy, setBusy] = useState(false);

    // Fetch machines
    const machinesQ = usePickerMachines(defaultFirmId !== undefined ? String(defaultFirmId) : undefined);
    const machines = useMemo(() => machinesQ.data ?? [], [machinesQ.data]);
    const machine = machines.find((m) => m.id === machineId);

    // Fetch assigned operators from maintenance assignments
    const operatorRowsQ = useOperatorRows();
    const operatorRows = useMemo(() => operatorRowsQ.data ?? [], [operatorRowsQ.data]);

    // When machine is selected, auto-fill receiver with operator assigned to this machine
    const assignedOperator = useMemo(() => {
        if (!machineId) return null;
        return operatorRows.find((o) => o.machine.id === machineId)?.operator.name ?? null;
    }, [machineId, operatorRows]);

    useEffect(() => {
        if (assignedOperator) {
            setReceiver(assignedOperator);
        }
    }, [assignedOperator]);

    // Unique list of all operators from assignment page
    const operatorOptions = useMemo(() => {
        const set = new Set<string>();
        operatorRows.forEach((o) => {
            if (o.operator.name?.trim()) set.add(o.operator.name.trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [operatorRows]);

    const derivedFirmId = useMemo(() => {
        if (machine?.firmId) return Number(machine.firmId);
        return defaultFirmId;
    }, [machine, defaultFirmId]);

    const firmName = useMemo(() => {
        if (machine?.firmName) return machine.firmName;
        if (derivedFirmId !== undefined) return firms.find((f) => f.id === derivedFirmId)?.name ?? '';
        return '';
    }, [machine, derivedFirmId, firms]);

    // Fetch site locations list from backend
    const siteLocationsQ = useSiteLocationsList();
    const siteLocationItems = siteLocationsQ.data ?? [];

    // Filter site location options based on the machine's project / firm
    const siteLocationOptions = useMemo(() => {
        if (!machineId) return [];

        const locationSet = new Set<string>();

        // If machine itself has a designated site, include it
        if (machine?.site?.trim()) {
            locationSet.add(machine.site.trim());
        }

        const projLower = firmName.trim().toLowerCase();
        const matchesProject = (fName?: string | null, fId?: number | string | null) => {
            if (derivedFirmId !== undefined && fId !== undefined && fId !== null && String(fId) === String(derivedFirmId)) {
                return true;
            }
            if (projLower && fName) {
                const parts = fName.split(',').map((s) => s.trim().toLowerCase());
                if (parts.includes(projLower)) return true;
            }
            return false;
        };

        // 1. From useSiteLocationsList
        siteLocationItems.forEach((l) => {
            const loc = (l.location || '').trim();
            if (!loc) return;
            if (matchesProject(l.firmName, l.firmId)) {
                locationSet.add(loc);
            }
        });

        // 2. From options?.siteLocationDetails
        (options?.siteLocationDetails || []).forEach((l: any) => {
            const loc = (l.location || '').trim();
            if (!loc) return;
            if (matchesProject(l.firmName, l.firmId)) {
                locationSet.add(loc);
            }
        });

        // 3. From options?.contractors with location
        (options?.contractors || []).forEach((c: any) => {
            if (matchesProject(c.firmName, c.firmId)) {
                const loc = (c.location || '').trim();
                if (loc && loc !== 'N/A' && loc !== '-') {
                    locationSet.add(loc);
                }
            }
        });

        // 4. Fallback if no specific locations for this project: include unassigned locations
        if (locationSet.size === 0) {
            siteLocationItems.forEach((l) => {
                const loc = (l.location || '').trim();
                const hasFirm = Boolean(l.firmId || (l.firmName && l.firmName !== '--' && l.firmName.trim() !== ''));
                if (!hasFirm && loc) {
                    locationSet.add(loc);
                }
            });
            (options?.siteLocationDetails || []).forEach((l: any) => {
                const loc = (l.location || '').trim();
                const hasFirm = Boolean(l.firmId || (l.firmName && l.firmName !== '--' && l.firmName.trim() !== ''));
                if (!hasFirm && loc) {
                    locationSet.add(loc);
                }
            });
            if (locationSet.size === 0 && (options?.siteLocations || []).length > 0) {
                (options?.siteLocations || []).forEach((loc: string) => {
                    const trimmed = (loc || '').trim();
                    if (trimmed) locationSet.add(trimmed);
                });
            }
        }

        return Array.from(locationSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [machineId, machine?.site, firmName, derivedFirmId, siteLocationItems, options?.siteLocationDetails, options?.siteLocations, options?.contractors]);

    // When machine changes, auto-select machine's site if assigned or reset
    useEffect(() => {
        if (!machineId) {
            setSiteLocation('');
            return;
        }
        if (machine?.site?.trim()) {
            setSiteLocation(machine.site.trim());
        } else {
            setSiteLocation('');
        }
    }, [machineId, machine?.site]);

    // Auto-select if there is exactly 1 option for the machine's project
    useEffect(() => {
        if (machineId && !siteLocation && siteLocationOptions.length === 1) {
            setSiteLocation(siteLocationOptions[0]);
        }
    }, [machineId, siteLocationOptions, siteLocation]);

    // Diesel items from master, default to 'DIESEL'
    const dieselItems = useMemo(() => {
        const key = Object.keys(options?.products ?? {}).find((k) => k.trim().toUpperCase() === DIESEL);
        const list = key ? (options?.products?.[key] ?? []) : [];
        return list.length > 0 ? list : [DIESEL];
    }, [options]);

    useEffect(() => {
        if (!product) {
            setProduct(dieselItems[0] || DIESEL);
        }
    }, [dieselItems, product]);

    const stockQ = useQuery({
        queryKey: ['store-stock', derivedFirmId, product],
        enabled: derivedFirmId !== undefined && !!product,
        queryFn: async () => {
            const res: any = await apiClient.get('/store/inventory/stock', { params: { firmId: derivedFirmId, item: product, groupHead: DIESEL } });
            return (res.data ?? []) as StockRow[];
        },
    });
    const stock = stockQ.data?.[0]?.current ?? 0;
    const stockKnown = stockQ.isSuccess;

    const litresN = Number(litres);

    const problems: string[] = [];
    if (!machineId) problems.push('Choose the machine.');
    else if (derivedFirmId === undefined) problems.push('The selected machine does not have an assigned project.');
    if (!receiver.trim()) problems.push('Enter or select the receiver / operator name.');
    if (!product) problems.push('Choose the diesel item.');
    if (!(litresN > 0)) problems.push('Enter the quantity (litres).');
    if (stockKnown && litresN > stock) problems.push(`Only ${stock} L of ${product} in this project's Store.`);
    if (!date) problems.push('Pick the date.');

    async function submit() {
        if (problems.length > 0) {
            toast.error(problems[0]);
            return;
        }
        setBusy(true);
        try {
            await createIssueRecords([
                {
                    timestamp: new Date().toISOString(),
                    uom: 'LTR',
                    group_head: DIESEL,
                    product_name: product || DIESEL,
                    quantity: litresN,
                    given_qty: 0,
                    status: 'Pending',
                    constructor_name: receiver.trim() || undefined,
                    site_location: siteLocation.trim() || undefined,
                    firm_name: firmName,
                    firm_id: derivedFirmId,
                    planned1: date,
                    issue_to: remarks.trim() || undefined,
                    issue_person_name: issuer.trim() || undefined,
                    issue_kind: 'ASSET_DIESEL',
                    machine_id: machineId,
                } as any,
            ]);
            toast.success('Diesel issue request created. Sent to Store Data for approval.');
            setMachineId('');
            setSiteLocation('');
            setReceiver('');
            setLitres('');
            setProduct(dieselItems[0] || DIESEL);
            setDate(new Date().toLocaleDateString('en-CA'));
            setRemarks('');
            void qc.invalidateQueries({ queryKey: ['store-stock'] });
            void qc.invalidateQueries({ queryKey: ['fleet'] });
            onCreated();
        } catch (e: any) {
            console.error('Error creating diesel issue:', e);
            toast.error(e?.response?.data?.message || (e instanceof Error && e.message ? e.message : 'Could not create the diesel issue request'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6 pb-10">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Diesel to a machine</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 1. Machine name */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Machine name <span className="text-destructive">*</span></Label>
                            <SearchableSelect
                                options={machines.map((m) => {
                                    const fName = m.firmName || firms.find((f) => String(f.id) === String(m.firmId))?.name;
                                    const subparts = [
                                        m.assetCode,
                                        fName,
                                    ].filter(Boolean);
                                    return {
                                        value: m.id,
                                        label: m.name,
                                        sublabel: subparts.join(' · '),
                                        keywords: [m.assetCode ?? '', m.registrationNo ?? '', fName ?? ''],
                                    };
                                })}
                                value={machineId}
                                onValueChange={(v) => setMachineId(v)}
                                placeholder={machinesQ.isLoading ? 'Loading machines…' : 'Select machine'}
                                searchPlaceholder="Search name, code or project"
                                emptyText="No machine found"
                                disabled={machinesQ.isLoading}
                                className="h-11 w-full"
                            />
                            {machine && firmName && (
                                <p className="text-xs text-slate-500 font-medium">
                                    Project: <span className="text-slate-700 font-semibold">{firmName}</span>
                                </p>
                            )}
                        </div>

                        {/* 2. Site location (cascaded based on machine's assigned project) */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Site location</Label>
                            {siteLocationOptions.length > 0 ? (
                                <SearchableSelect
                                    options={siteLocationOptions.map((loc) => ({
                                        value: loc,
                                        label: loc,
                                    }))}
                                    value={siteLocation}
                                    onValueChange={(val) => setSiteLocation(val)}
                                    placeholder={!machineId ? 'Select machine first' : 'Select site location'}
                                    searchPlaceholder="Search site location"
                                    emptyText="No site location found"
                                    disabled={!machineId}
                                    className="h-11 w-full"
                                />
                            ) : (
                                <Input
                                    value={siteLocation}
                                    onChange={(e) => setSiteLocation(e.target.value)}
                                    placeholder={!machineId ? 'Select machine first' : 'Enter site location'}
                                    disabled={!machineId}
                                    className="h-11"
                                />
                            )}
                            {machine?.site && siteLocation === machine.site && (
                                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                    <MapPin className="size-3" /> Auto-selected machine's current site
                                </p>
                            )}
                        </div>

                        {/* 3. Receiver name (operator fetched from maintenance assignments) */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Receiver name (Operator) <span className="text-destructive">*</span></Label>
                            <div className="flex gap-2">
                                {operatorOptions.length > 0 ? (
                                    <div className="relative flex-1">
                                        <SearchableSelect
                                            options={operatorOptions.map((op) => ({
                                                value: op,
                                                label: op,
                                            }))}
                                            value={receiver}
                                            onValueChange={(val) => setReceiver(val)}
                                            placeholder={operatorRowsQ.isLoading ? 'Loading operators…' : 'Select assigned operator'}
                                            searchPlaceholder="Search operator name"
                                            emptyText="No assigned operator found"
                                            className="h-11 w-full"
                                        />
                                    </div>
                                ) : (
                                    <Input
                                        value={receiver}
                                        onChange={(e) => setReceiver(e.target.value)}
                                        placeholder="Enter receiver name"
                                        className="h-11 flex-1"
                                    />
                                )}
                            </div>
                            {assignedOperator && receiver === assignedOperator && (
                                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                    <UserCheck className="size-3" /> Auto-selected assigned operator for this machine
                                </p>
                            )}
                        </div>

                        {/* 4. Quantity (uom auto set to LTR) */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Quantity <span className="text-destructive">*</span></Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    value={litres}
                                    onChange={(e) => setLitres(e.target.value)}
                                    placeholder="0"
                                    className="h-11 pr-14"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    LTR
                                </span>
                            </div>
                            {stockKnown && (
                                <p className={`text-xs font-semibold ${stock <= 0 ? 'text-destructive' : 'text-slate-500'}`}>
                                    {litresN > stock ? (
                                        <span className="flex items-center gap-1 text-destructive">
                                            <AlertTriangle className="size-3" /> More than Store holds ({stock} L)
                                        </span>
                                    ) : (
                                        `Store stock: ${stock} L`
                                    )}
                                </p>
                            )}
                        </div>

                        {/* 5. Diesel item */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Diesel item</Label>
                            <Select value={product} onValueChange={setProduct}>
                                <SelectTrigger className="w-full h-11 bg-white border-slate-200">
                                    <SelectValue placeholder="Select diesel item" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dieselItems.map((p) => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 6. Issue date */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Issue date <span className="text-destructive">*</span></Label>
                            <Input type="date" value={date} max={new Date().toLocaleDateString('en-CA')} onChange={(e) => setDate(e.target.value)} className="h-11" />
                        </div>

                        {/* 7. Issued by */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Issued by</Label>
                            <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Issuer name" className="h-11" />
                        </div>
                    </div>

                    {/* 7. Remarks */}
                    <div className="space-y-1.5">
                        <Label className="text-slate-600 font-semibold">Remarks</Label>
                        <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} maxLength={500} placeholder="Enter remarks or notes" />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                {problems.length > 0 && (litres !== '' || machineId !== '') && (
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
                    {busy ? <Loader size={20} color="white" /> : (<><Fuel className="mr-2 size-4" /> Submit diesel issue</>)}
                </Button>
            </div>
        </div>
    );
}

export default AssetDieselIssueForm;
