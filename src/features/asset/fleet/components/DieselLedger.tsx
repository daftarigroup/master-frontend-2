import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Download,
    FileSpreadsheet,
    Fuel,
    Table,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CompanySelectField,
    type CompanyOption,
} from '@/features/organization/components/CompanySelectField';
import { useProject } from '@/context/ProjectContext';
import { cn } from '@/lib/utils';
import { apiErrorMessage, fmtDay, fmtNum, istMonth, shiftMonth } from '../lib/format';
import { fleetApi } from '../server/api/fleetApi';
import { isFirmId, useFleetMachines, useLedger } from '../server/tanstackQuery/useFleetQueries';
import {
    UNIT_LABEL,
    type LedgerCell,
    type LedgerMachineMeta,
    type LedgerRow,
    type MonthLedger,
} from '../types/types';
import { OwnershipBadge } from './OwnershipBadge';
import { DieselTransactionLedger } from './DieselTransactionLedger';

const monthLabel = (m: string) =>
    new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
const dash = (n: number | null | undefined, zeroAsBlank = false) =>
    n === null || n === undefined || (zeroAsBlank && n === 0) ? '' : fmtNum(n);

/** Diesel litres of a day; an amber dot when an issue that day has a doubtful meter reading. */
function DieselCell({ cell }: { cell?: LedgerCell }) {
    if (!cell) return null;
    return (
        <>
            {dash(cell.diesel, true)}
            {cell.flagged && (
                <span
                    title="Meter reading needs a check"
                    className="ml-1 inline-block size-2 rounded-full bg-amber-500 align-middle"
                />
            )}
        </>
    );
}

/** Usage cell: a number for complete entries, "open" while the entry has no stop reading yet. */
function UsageCell({ cell }: { cell?: LedgerCell }) {
    if (!cell) return null;
    return (
        <>
            {cell.usage !== null ? fmtNum(cell.usage) : ''}
            {cell.hasOpen && (
                <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] font-bold uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                    open
                </span>
            )}
        </>
    );
}

function LedgerTable({ ledger }: { ledger: MonthLedger }) {
    const showOther = ledger.totals.other > 0; // old diesel logged without a machine; empty in new months
    const th =
        'border-b border-r bg-muted px-2 py-1.5 text-center text-[11px] font-semibold whitespace-nowrap';
    const td = 'border-b border-r px-2 py-1 text-right tabular-nums text-xs whitespace-nowrap';
    const sticky = 'sticky left-0 z-10';
    return (
        <div className="hidden max-h-[70vh] overflow-auto rounded-lg border md:block">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-20">
                    <tr>
                        <th rowSpan={2} className={cn(th, sticky, 'z-30 text-left')}>
                            Date
                        </th>
                        {ledger.machines.map((m) => (
                            <th
                                key={m.id}
                                colSpan={m.readingUnit === 'NONE' ? 1 : 4}
                                className={cn(th, 'border-l-2')}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    {m.name}
                                    <OwnershipBadge value={m.ownershipType} />
                                </div>
                            </th>
                        ))}
                        {showOther && (
                            <th rowSpan={2} className={th}>
                                Other
                            </th>
                        )}
                        <th rowSpan={2} className={th}>
                            Total
                        </th>
                    </tr>
                    <tr>
                        {ledger.machines.map((m) =>
                            m.readingUnit === 'NONE' ? (
                                <th key={m.id} className={cn(th, 'border-l-2 font-normal')}>
                                    Diesel
                                </th>
                            ) : (
                                ['Diesel', 'Start', 'Stop', 'Usage'].map((h, i) => (
                                    <th
                                        key={`${m.id}-${h}`}
                                        className={cn(th, 'font-normal', i === 0 && 'border-l-2')}
                                    >
                                        {h}
                                        {h === 'Usage' && (
                                            <span className="ml-0.5 text-[9px] text-muted-foreground">
                                                {UNIT_LABEL[m.readingUnit]}
                                            </span>
                                        )}
                                    </th>
                                ))
                            )
                        )}
                    </tr>
                </thead>
                <tbody>
                    {ledger.rows.map((r) => (
                        <tr key={r.date}>
                            <td className={cn(td, sticky, 'text-left font-medium bg-background')}>
                                {fmtDay(r.date)}
                            </td>
                            {ledger.machines.map((m) => {
                                const c = r.cells[m.id];
                                return m.readingUnit === 'NONE' ? (
                                    <td key={m.id} className={cn(td, 'border-l-2')}>
                                        <DieselCell cell={c} />
                                    </td>
                                ) : (
                                    [
                                        <td key={`${m.id}d`} className={cn(td, 'border-l-2')}>
                                            <DieselCell cell={c} />
                                        </td>,
                                        <td key={`${m.id}s`} className={td}>
                                            {dash(c?.start)}
                                        </td>,
                                        <td key={`${m.id}e`} className={td}>
                                            {dash(c?.stop)}
                                        </td>,
                                        <td key={`${m.id}u`} className={td}>
                                            <UsageCell cell={c} />
                                        </td>,
                                    ]
                                );
                            })}
                            {showOther && <td className={td}>{dash(r.other, true)}</td>}
                            <td className={cn(td, 'font-semibold')}>{dash(r.total, true)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-20">
                    <tr className="font-semibold">
                        <td className={cn(td, sticky, 'z-30 bg-muted text-left')}>Total</td>
                        {ledger.machines.map((m) => {
                            const t = ledger.totals.perMachine[m.id];
                            return m.readingUnit === 'NONE' ? (
                                <td key={m.id} className={cn(td, 'border-l-2 bg-muted')}>
                                    {fmtNum(t?.diesel ?? 0)}
                                </td>
                            ) : (
                                [
                                    <td key={`${m.id}d`} className={cn(td, 'border-l-2 bg-muted')}>
                                        {fmtNum(t?.diesel ?? 0)}
                                    </td>,
                                    <td key={`${m.id}s`} className={cn(td, 'bg-muted')} />,
                                    <td key={`${m.id}e`} className={cn(td, 'bg-muted')} />,
                                    <td key={`${m.id}u`} className={cn(td, 'bg-muted')}>
                                        {fmtNum(t?.usage ?? 0)}
                                    </td>,
                                ]
                            );
                        })}
                        {showOther && (
                            <td className={cn(td, 'bg-muted')}>{fmtNum(ledger.totals.other)}</td>
                        )}
                        <td className={cn(td, 'bg-muted')}>{fmtNum(ledger.totals.total)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

function DayCard({ row, machines }: { row: LedgerRow; machines: LedgerMachineMeta[] }) {
    const active = machines.filter((m) => row.cells[m.id]);
    return (
        <Card className="space-y-2 p-3">
            <div className="flex items-center justify-between">
                <span className="font-semibold">{fmtDay(row.date)}</span>
                <span className="text-sm font-bold tabular-nums">{fmtNum(row.total)} L</span>
            </div>
            {row.other > 0 && (
                <div className="text-xs text-muted-foreground">Other {fmtNum(row.other)}</div>
            )}
            {active.map((m) => {
                const c = row.cells[m.id];
                return (
                    <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 border-t pt-1.5 text-xs"
                    >
                        <span className="min-w-0 truncate font-medium">{m.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                            {c.diesel > 0 && (
                                <b className="text-foreground">{fmtNum(c.diesel)} L</b>
                            )}
                            {c.flagged && (
                                <span
                                    title="Meter reading needs a check"
                                    className="ml-1 inline-block size-2 rounded-full bg-amber-500 align-middle"
                                />
                            )}
                            {c.start !== null &&
                                ` · ${fmtNum(c.start)}→${c.stop !== null ? fmtNum(c.stop) : '…'}`}
                            {c.usage !== null &&
                                ` · ${fmtNum(c.usage)} ${UNIT_LABEL[m.readingUnit]}`}
                            {c.hasOpen && (
                                <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] font-bold uppercase text-amber-800">
                                    open
                                </span>
                            )}
                        </span>
                    </div>
                );
            })}
        </Card>
    );
}

export function DieselLedger() {
    const { selectedProject, selectProject, availableProjects } = useProject();
    const [firm, setFirm] = useState<CompanyOption | null>(() => {
        if (selectedProject && selectedProject.id !== 'all') {
            return { id: String(selectedProject.id), name: selectedProject.name };
        }
        return null;
    });
    const [machineId, setMachineId] = useState<string>('ALL');

    // Sync with global workspace project if changed externally
    useEffect(() => {
        if (selectedProject && selectedProject.id !== 'all') {
            const idStr = String(selectedProject.id);
            if (firm?.id !== idStr) {
                setFirm({ id: idStr, name: selectedProject.name });
                setMachineId('ALL');
            }
        } else if (selectedProject?.id === 'all' && firm !== null) {
            setFirm(null);
            setMachineId('ALL');
        }
    }, [selectedProject?.id]);

    const onFirm = useCallback(
        (c: CompanyOption) => {
            if (!c.id) {
                setFirm(null);
                setMachineId('ALL');
                selectProject?.({ id: 'all', name: 'All Projects' });
                return;
            }
            setFirm(c);
            setMachineId('ALL');
            const matching = availableProjects?.find((p) => String(p.id) === String(c.id));
            if (matching) {
                selectProject?.(matching);
            } else {
                selectProject?.({ id: Number(c.id), name: c.name });
            }
        },
        [availableProjects, selectProject]
    );
    const [month, setMonth] = useState(istMonth());
    const [includeIdle, setIncludeIdle] = useState(true);
    const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);

    const [tab, setTab] = useState<'chart' | 'ledger'>('chart');
    const firmId = firm?.id ?? null;
    const q = useLedger({ firmId, month, includeIdle });
    const ledger = q.data;

    // Load accessible machines: when firmId is selected, scoped to that firm; otherwise all machines
    const machinesQ = useFleetMachines({ firmId: isFirmId(firmId) ? firmId : undefined });
    const fleetMachines = useMemo(() => machinesQ.data ?? [], [machinesQ.data]);

    const machineOptions = useMemo(() => {
        const map = new Map<
            string,
            {
                id: string;
                name: string;
                assetCode?: string;
                firmId?: string | null;
                firmName?: string | null;
            }
        >();

        (ledger?.machines ?? []).forEach((m) => {
            map.set(m.id, {
                id: m.id,
                name: m.name,
                assetCode: m.registrationNo ?? undefined,
                firmId: firmId ? String(firmId) : undefined,
                firmName: firm?.name ?? undefined,
            });
        });

        fleetMachines.forEach((m) => {
            const currentFirmId = m.assignment?.firmId ?? m.firmId ?? null;
            const currentFirmName = m.assignment?.firmName ?? m.firmName ?? null;
            // When a firm is selected, do not list machines currently assigned to another project
            if (firmId && String(currentFirmId) !== String(firmId)) {
                return;
            }
            const existing = map.get(m.id);
            if (!existing) {
                map.set(m.id, {
                    id: m.id,
                    name: m.name,
                    assetCode: m.assetCode ?? m.registrationNo ?? undefined,
                    firmId: currentFirmId,
                    firmName: currentFirmName,
                });
            } else {
                if (!existing.firmId && currentFirmId) existing.firmId = currentFirmId;
                if (!existing.firmName && currentFirmName) existing.firmName = currentFirmName;
            }
        });

        return Array.from(map.values());
    }, [fleetMachines, ledger?.machines, firmId, firm?.name]);

    const handleMachineSelect = useCallback(
        (selectedId: string) => {
            setMachineId(selectedId);
            if (selectedId === 'ALL') return;

            const chosen =
                machineOptions.find((m) => m.id === selectedId) ||
                fleetMachines.find((m) => m.id === selectedId);

            if (!chosen) return;

            const targetFirmId = (chosen as any).assignment?.firmId ?? chosen.firmId;
            const targetFirmName = (chosen as any).assignment?.firmName ?? chosen.firmName;

            if (targetFirmId) {
                const targetFirmIdStr = String(targetFirmId);
                if (!firm || String(firm.id) !== targetFirmIdStr) {
                    const resolvedName = targetFirmName || `Project ${targetFirmIdStr}`;
                    const newFirm: CompanyOption = {
                        id: targetFirmIdStr,
                        name: resolvedName,
                    };
                    setFirm(newFirm);

                    const matching = availableProjects?.find((p) => String(p.id) === targetFirmIdStr);
                    if (matching) {
                        selectProject?.(matching);
                    } else {
                        selectProject?.({ id: Number(targetFirmIdStr), name: resolvedName });
                    }

                    toast.info(`Project automatically set to ${resolvedName}`);
                }
            }
        },
        [machineOptions, fleetMachines, firm, availableProjects, selectProject]
    );

    // Filtered ledger: lists all machines 1 by 1 on the chart when "ALL", or isolates the single chosen machine
    const displayLedger: MonthLedger | null = useMemo(() => {
        if (!ledger) return null;

        // When no specific machine is selected ("ALL"), list all machines for this firm on the chart 1 by 1
        if (!machineId || machineId === 'ALL') {
            const ledgerMachineMap = new Map<string, LedgerMachineMeta>();

            // Filter out any machines from ledger that are actively assigned to a different firm
            const activeLedgerMachines = ledger.machines.filter((m) => {
                const fm = fleetMachines.find((x) => x.id === m.id);
                if (fm && firmId) {
                    const currentFirmId = fm.assignment?.firmId ?? fm.firmId;
                    if (String(currentFirmId) !== String(firmId)) return false;
                }
                return true;
            });
            activeLedgerMachines.forEach((m) => ledgerMachineMap.set(m.id, m));

            // Ensure every machine belonging to the firm is included (excluding machines transferred out)
            fleetMachines.forEach((fm) => {
                const currentFirmId = fm.assignment?.firmId ?? fm.firmId ?? null;
                if (firmId && String(currentFirmId) !== String(firmId)) {
                    return;
                }
                if (!ledgerMachineMap.has(fm.id)) {
                    ledgerMachineMap.set(fm.id, {
                        id: fm.id,
                        name: fm.name,
                        readingUnit: fm.readingUnit ?? 'HOURS',
                        ownershipType: fm.ownershipType ?? 'OWNED',
                        registrationNo: fm.registrationNo ?? null,
                    });
                }
            });

            const allMachines = Array.from(ledgerMachineMap.values()).sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            // Respect user toggle if they deliberately turn off "Show idle machines"
            const finalMachines = includeIdle
                ? allMachines
                : allMachines.filter(
                      (m) =>
                          (ledger.totals.perMachine[m.id]?.diesel ?? 0) > 0 ||
                          (ledger.totals.perMachine[m.id]?.usage ?? 0) > 0
                  );

            return {
                ...ledger,
                machines: finalMachines,
            };
        }

        const filteredMachines = ledger.machines.filter((m) => m.id === machineId);
        if (filteredMachines.length > 0) {
            const rows = ledger.rows.map((r) => {
                const cell = r.cells[machineId];
                const machineDiesel = cell?.diesel ?? 0;
                return {
                    ...r,
                    total: machineDiesel,
                };
            });

            const machineTotal = ledger.totals.perMachine[machineId]?.diesel ?? 0;

            return {
                ...ledger,
                machines: filteredMachines,
                rows,
                totals: {
                    ...ledger.totals,
                    total: machineTotal,
                    other: 0,
                },
            };
        }

        const selectedMeta = fleetMachines.find((m) => m.id === machineId);
        const fallbackMachines: LedgerMachineMeta[] = selectedMeta
            ? [
                  {
                      id: selectedMeta.id,
                      name: selectedMeta.name,
                      readingUnit: selectedMeta.readingUnit ?? 'HOURS',
                      ownershipType: selectedMeta.ownershipType ?? 'OWNED',
                      registrationNo: selectedMeta.registrationNo ?? null,
                  },
              ]
            : [];

        return {
            ...ledger,
            machines: fallbackMachines,
            rows: ledger.rows.map((r) => ({ ...r, total: 0 })),
            totals: {
                ...ledger.totals,
                total: 0,
                other: 0,
            },
        };
    }, [ledger, machineId, fleetMachines, includeIdle]);

    // rows worth a card on mobile: any movement, or a negative balance
    const cardRows = useMemo(
        () =>
            (displayLedger?.rows ?? []).filter(
                (r) => r.total > 0 || Object.keys(r.cells).length > 0
            ),
        [displayLedger]
    );

    const download = async (format: 'xlsx' | 'csv') => {
        if (!firmId) return;
        setExporting(format);
        try {
            const { blob, name } = await fleetApi.exportLedger({
                firmId,
                month,
                format,
                includeIdle,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'Export failed'));
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with Title and Tabs Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800">
                        <Fuel className="size-5 text-blue-600" /> Diesel Log
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Diesel issued from Store to each machine, with the day's meter readings and
                        allocation records
                    </p>
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as 'chart' | 'ledger')}>
                    <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
                        <TabsTrigger
                            value="chart"
                            className="gap-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs px-3 py-1.5"
                        >
                            <BarChart3 className="size-3.5 text-blue-600" />
                            <span>Diesel Chart</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="ledger"
                            className="gap-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs px-3 py-1.5"
                        >
                            <Table className="size-3.5 text-indigo-600" />
                            <span>Diesel Ledger</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'chart' | 'ledger')}>
                <TabsContent value="chart" className="space-y-4 mt-0 focus-visible:outline-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                            Sheet matrix of daily fuel allocations and machine meter usage
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                className="h-9"
                                disabled={!firmId || !!exporting}
                                onClick={() => download('xlsx')}
                            >
                                <FileSpreadsheet className="mr-1.5 size-4" />{' '}
                                {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
                            </Button>
                            <Button
                                variant="outline"
                                className="h-9"
                                disabled={!firmId || !!exporting}
                                onClick={() => download('csv')}
                            >
                                <Download className="mr-1.5 size-4" /> CSV
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-2.5 px-3.5 shadow-xs">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                    Firm / site:
                                </Label>
                                <div className="w-56 sm:w-64">
                                    <CompanySelectField
                                        value={firm?.id ? String(firm.id) : ''}
                                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-ring focus:outline-hidden transition-colors"
                                        onSelect={onFirm}
                                    />
                                </div>
                            </div>

                            <div className="hidden h-5 w-px bg-border sm:block" />

                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                    Machine:
                                </Label>
                                <Select
                                    value={machineId}
                                    onValueChange={handleMachineSelect}
                                    disabled={machinesQ.isLoading && machineOptions.length === 0}
                                >
                                    <SelectTrigger className="h-9 w-48 sm:w-60 text-xs font-medium bg-background">
                                        <SelectValue placeholder="All Machines" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        <SelectItem value="ALL">All Machines</SelectItem>
                                        {machineOptions.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                <span className="font-medium">{m.name}</span>
                                                {m.assetCode ? (
                                                    <span className="text-muted-foreground ml-1">
                                                        ({m.assetCode})
                                                    </span>
                                                ) : null}
                                                {!isFirmId(firmId) && m.firmName ? (
                                                    <span className="text-[11px] text-muted-foreground/80 ml-1.5 font-normal">
                                                        • {m.firmName}
                                                    </span>
                                                ) : null}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="hidden h-5 w-px bg-border sm:block" />

                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                    Month:
                                </Label>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="size-9 shrink-0"
                                        onClick={() => setMonth((m) => shiftMonth(m, -1))}
                                        aria-label="Previous month"
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <Input
                                        type="month"
                                        value={month}
                                        max={istMonth()}
                                        onChange={(e) => e.target.value && setMonth(e.target.value)}
                                        className="h-9 w-38 text-xs font-medium"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="size-9 shrink-0"
                                        disabled={month >= istMonth()}
                                        onClick={() => setMonth((m) => shiftMonth(m, 1))}
                                        aria-label="Next month"
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                            <Switch checked={includeIdle} onCheckedChange={setIncludeIdle} />
                            <span className="whitespace-nowrap">Show idle machines</span>
                        </label>
                    </div>

                    {!firmId && (
                        <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                            <Fuel className="size-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-700">No project or machine selected</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Choose a firm or select any machine above to see its monthly diesel log sheet.
                            </p>
                        </Card>
                    )}
                    {q.isError && (
                        <Card className="p-4 text-sm text-destructive">
                            {apiErrorMessage(q.error, 'Could not load the diesel log')}
                        </Card>
                    )}

                    {q.isLoading && firmId && (
                        <Card className="p-6 text-center text-sm text-muted-foreground">
                            Loading {monthLabel(month)}…
                        </Card>
                    )}

                    {displayLedger && (
                        <>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                <span>
                                    Issued{' '}
                                    <b className="tabular-nums">
                                        {fmtNum(displayLedger.totals.total)}
                                    </b>{' '}
                                    L
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Store stock is on the Inventory page.
                                </span>
                            </div>

                            {displayLedger.machines.length === 0 ? (
                                <Card className="p-6 text-center text-sm text-muted-foreground">
                                    {machineId !== 'ALL'
                                        ? `No diesel or machine activity for this machine in ${monthLabel(month)}.`
                                        : `No diesel or machine activity in ${monthLabel(month)}.`}
                                </Card>
                            ) : (
                                <>
                                    <LedgerTable ledger={displayLedger} />
                                    <div className="space-y-2 md:hidden">
                                        {cardRows.length === 0 ? (
                                            <Card className="p-4 text-center text-sm text-muted-foreground">
                                                Nothing recorded this month.
                                            </Card>
                                        ) : (
                                            cardRows.map((r) => (
                                                <DayCard
                                                    key={r.date}
                                                    row={r}
                                                    machines={displayLedger.machines}
                                                />
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </TabsContent>

                <TabsContent value="ledger" className="space-y-4 mt-0 focus-visible:outline-none">
                    <DieselTransactionLedger initialFirm={firm} initialMonth={month} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default DieselLedger;
