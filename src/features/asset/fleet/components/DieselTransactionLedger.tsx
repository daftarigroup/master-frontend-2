import { useEffect, useMemo, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    Fuel,
    RefreshCw,
    Search,
    Truck,
    User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CompanySelectField,
    type CompanyOption,
} from '@/features/organization/components/CompanySelectField';
import { useProject } from '@/context/ProjectContext';
import { cn } from '@/lib/utils';
import { apiErrorMessage, fmtDay, fmtNum, istMonth, shiftMonth } from '../lib/format';
import { useDieselLogs, useFleetMachines } from '../server/tanstackQuery/useFleetQueries';
import type { DieselLogRow } from '../types/types';
import { OwnershipBadge } from './OwnershipBadge';

interface Props {
    initialFirm?: CompanyOption | null;
    initialMonth?: string;
}

const PAGE_SIZE = 25;

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
    STORE_ISSUE: {
        label: 'Store Issue',
        className:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    },
    DAILY_ENTRY: {
        label: 'Daily Entry',
        className:
            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    },
    MANUAL: {
        label: 'Manual',
        className:
            'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
};

export function DieselTransactionLedger({ initialFirm = null, initialMonth = istMonth() }: Props) {
    const { selectProject, availableProjects } = useProject();
    const [firm, setFirm] = useState<CompanyOption | null>(initialFirm);
    const [month, setMonth] = useState(initialMonth);
    const [machineId, setMachineId] = useState<string>('ALL');
    const [sourceFilter, setSourceFilter] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        setFirm(initialFirm);
    }, [initialFirm]);

    const firmId = firm?.id ? String(firm.id) : undefined;

    // Month date bounds for API
    const fromDate = useMemo(() => `${month}-01`, [month]);
    const toDate = useMemo(() => {
        const [y, m] = month.split('-').map(Number);
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        return `${month}-${String(lastDay).padStart(2, '0')}`;
    }, [month]);

    // Load accessible machines for the filter dropdown
    const machinesQ = useFleetMachines({ firmId });
    const rawMachines = useMemo(() => machinesQ.data ?? [], [machinesQ.data]);
    const machines = useMemo(() => {
        if (!firmId) return rawMachines;
        return rawMachines.filter((m) => {
            const currentFirmId = (m as any)?.assignment?.firmId ?? m.firmId;
            return String(currentFirmId) === String(firmId);
        });
    }, [rawMachines, firmId]);

    const handleVehicleSelect = (val: string) => {
        setMachineId(val);
        setPage(1);
        if (val === 'ALL') return;

        const chosen = machines.find((m) => m.id === val);
        const targetFirmId = (chosen as any)?.assignment?.firmId ?? chosen?.firmId;
        const targetFirmName = (chosen as any)?.assignment?.firmName ?? chosen?.firmName;

        if (targetFirmId) {
            const targetFirmIdStr = String(targetFirmId);
            if (!firm || String(firm.id) !== targetFirmIdStr) {
                const resolvedName = targetFirmName || `Project ${targetFirmIdStr}`;
                const newFirm = { id: targetFirmIdStr, name: resolvedName };
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
    };

    // Query diesel log records
    const queryParams = useMemo(() => {
        const p: Record<string, any> = {
            from: fromDate,
            to: toDate,
            limit: 1000,
            offset: 0,
        };
        if (firmId) p.firmId = firmId;
        if (machineId && machineId !== 'ALL') p.machineId = machineId;
        if (search.trim()) p.q = search.trim();
        return p;
    }, [firmId, machineId, fromDate, toDate, search]);

    const logsQ = useDieselLogs(queryParams);
    const allRows: DieselLogRow[] = useMemo(() => logsQ.data?.rows ?? [], [logsQ.data]);

    // Client-side source filter
    const filteredRows = useMemo(() => {
        if (sourceFilter === 'ALL') return allRows;
        return allRows.filter((r) => r.source === sourceFilter);
    }, [allRows, sourceFilter]);

    // Summary Metrics
    const metrics = useMemo(() => {
        let totalLitres = 0;
        let totalAmount = 0;
        const vehicleSet = new Set<string>();

        filteredRows.forEach((r) => {
            totalLitres += r.litres || 0;
            if (r.amount) totalAmount += r.amount;
            if (r.machineId) vehicleSet.add(r.machineId);
            else if (r.consumerLabel) vehicleSet.add(r.consumerLabel);
        });

        return {
            totalLitres,
            totalAmount,
            totalEntries: filteredRows.length,
            activeVehicles: vehicleSet.size,
        };
    }, [filteredRows]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredRows.slice(start, start + PAGE_SIZE);
    }, [filteredRows, currentPage]);

    // Export to CSV
    const handleExportCsv = () => {
        if (filteredRows.length === 0) return;
        const headers = [
            'ID',
            'Date',
            'Time',
            'Firm',
            'Site Location',
            'Vehicle / Machine',
            'Asset Code',
            'Registration No',
            'Ownership',
            'Diesel Litres (L)',
            'Flags',
            'Issued To / Operator',
            'Issued By',
            'Source',
            'Rate Per Litre (INR)',
            'Amount (INR)',
            'Note / Remarks',
        ];

        const escapeCsv = (val: unknown) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const lines = filteredRows.map((r) => {
            const timeStr = r.issuedAt
                ? new Date(r.issuedAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                  })
                : '';
            return [
                escapeCsv(r.id),
                escapeCsv(r.issueDate),
                escapeCsv(timeStr),
                escapeCsv(r.firmName),
                escapeCsv(r.siteLocation ?? ''),
                escapeCsv(r.machineName ?? r.consumerLabel ?? 'Other'),
                escapeCsv(r.assetCode ?? ''),
                escapeCsv(r.registrationNo ?? ''),
                escapeCsv(r.ownershipType ?? ''),
                escapeCsv(r.litres),
                escapeCsv((r.flags ?? []).join('; ')),
                escapeCsv(r.operator ?? ''),
                escapeCsv(r.issuedBy ?? ''),
                escapeCsv(r.source),
                escapeCsv(r.ratePerLitre ?? ''),
                escapeCsv(r.amount ?? ''),
                escapeCsv(r.note ?? ''),
            ].join(',');
        });

        const csvContent = [headers.join(','), ...lines].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `diesel-allocation-ledger-${month}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-slate-200 bg-linear-to-br from-blue-50/50 to-indigo-50/30 p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                        <Fuel className="size-4 shrink-0" />
                        <span>Total Diesel Allocated</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold tracking-tight text-slate-800">
                        {fmtNum(metrics.totalLitres)}{' '}
                        <span className="text-xs font-medium text-slate-500">L</span>
                    </div>
                </Card>

                <Card className="border-slate-200 bg-linear-to-br from-slate-50 to-slate-100/50 p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <RefreshCw className="size-4 shrink-0 text-slate-500" />
                        <span>Total Allocations</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold tracking-tight text-slate-800">
                        {metrics.totalEntries}{' '}
                        <span className="text-xs font-medium text-slate-500">records</span>
                    </div>
                </Card>

                <Card className="border-slate-200 bg-linear-to-br from-emerald-50/40 to-teal-50/30 p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                        <Truck className="size-4 shrink-0" />
                        <span>Active Machines</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold tracking-tight text-slate-800">
                        {metrics.activeVehicles}{' '}
                        <span className="text-xs font-medium text-slate-500">vehicles</span>
                    </div>
                </Card>

                <Card className="border-slate-200 bg-linear-to-br from-purple-50/40 to-pink-50/30 p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-600">
                        <span>Total Valuation</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold tracking-tight text-slate-800">
                        {metrics.totalAmount > 0 ? `₹${fmtNum(metrics.totalAmount)}` : '—'}
                    </div>
                </Card>
            </div>

            {/* Filter and Controls Toolbar */}
            <Card className="p-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Firm Selector */}
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                Firm / site:
                            </Label>
                            <div className="w-48 sm:w-56">
                                <CompanySelectField
                                    value={firm?.id ? String(firm.id) : ''}
                                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-ring focus:outline-hidden transition-colors"
                                    onSelect={(c) => {
                                        if (!c.id) {
                                            setFirm(null);
                                            setMachineId('ALL');
                                            setPage(1);
                                            selectProject?.({ id: 'all', name: 'All Projects' });
                                            return;
                                        }
                                        setFirm(c);
                                        setMachineId('ALL');
                                        setPage(1);
                                        const matching = availableProjects?.find((p) => String(p.id) === String(c.id));
                                        if (matching) {
                                            selectProject?.(matching);
                                        } else {
                                            selectProject?.({ id: Number(c.id), name: c.name });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Month Selector */}
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                Month:
                            </Label>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-9 shrink-0"
                                    onClick={() => {
                                        setMonth((m) => shiftMonth(m, -1));
                                        setPage(1);
                                    }}
                                    aria-label="Previous month"
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <Input
                                    type="month"
                                    value={month}
                                    max={istMonth()}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setMonth(e.target.value);
                                            setPage(1);
                                        }
                                    }}
                                    className="h-9 w-36 text-xs font-medium"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-9 shrink-0"
                                    disabled={month >= istMonth()}
                                    onClick={() => {
                                        setMonth((m) => shiftMonth(m, 1));
                                        setPage(1);
                                    }}
                                    aria-label="Next month"
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Vehicle / Machine Filter */}
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                Vehicle:
                            </Label>
                            <Select
                                value={machineId}
                                onValueChange={handleVehicleSelect}
                                disabled={machinesQ.isLoading && machines.length === 0}
                            >
                                <SelectTrigger className="h-9 w-44 sm:w-56 text-xs font-medium bg-background">
                                    <SelectValue placeholder="All Vehicles" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                    <SelectItem value="ALL">All Vehicles</SelectItem>
                                    {machines.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <span className="font-medium">{m.name}</span>
                                            {m.assetCode ? (
                                                <span className="text-muted-foreground ml-1">
                                                    ({m.assetCode})
                                                </span>
                                            ) : null}
                                            {!firmId && m.firmName ? (
                                                <span className="text-[11px] text-muted-foreground/80 ml-1.5 font-normal">
                                                    • {m.firmName}
                                                </span>
                                            ) : null}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Source Filter */}
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                Source:
                            </Label>
                            <Select
                                value={sourceFilter}
                                onValueChange={(val) => {
                                    setSourceFilter(val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-9 w-36 text-xs font-medium bg-background">
                                    <SelectValue placeholder="All Sources" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Sources</SelectItem>
                                    <SelectItem value="STORE_ISSUE">Store Issue</SelectItem>
                                    <SelectItem value="DAILY_ENTRY">Daily Entry</SelectItem>
                                    <SelectItem value="MANUAL">Manual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:w-56">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search vehicle, operator, note…"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="h-9 pl-8 text-xs bg-background"
                            />
                        </div>

                        {/* Export CSV Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 shrink-0 font-medium"
                            onClick={handleExportCsv}
                            disabled={filteredRows.length === 0}
                        >
                            <Download className="size-4" />
                            <span>Export CSV</span>
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Loading & Error States */}
            {logsQ.isLoading && (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading diesel allocations…
                </Card>
            )}

            {logsQ.isError && (
                <Card className="p-4 text-sm text-destructive border-destructive/20 bg-destructive/5">
                    {apiErrorMessage(logsQ.error, 'Could not load diesel allocation records')}
                </Card>
            )}

            {/* Tabular Ledger View */}
            {!logsQ.isLoading && !logsQ.isError && (
                <>
                    {filteredRows.length === 0 ? (
                        <Card className="p-12 text-center text-sm text-muted-foreground">
                            <Fuel className="size-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-700">
                                No diesel allocation records found
                            </p>
                            <p className="text-xs mt-1">
                                Try adjusting the firm, vehicle, month, or search criteria.
                            </p>
                        </Card>
                    ) : (
                        <div className="rounded-xl border border-slate-200 bg-card overflow-hidden shadow-2xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3.5 py-3 whitespace-nowrap">
                                                Date & Time
                                            </th>
                                            <th className="px-3.5 py-3 whitespace-nowrap">
                                                Vehicle / Machine
                                            </th>
                                            <th className="px-3.5 py-3 whitespace-nowrap">
                                                Firm / Site
                                            </th>
                                            <th className="px-3.5 py-3 whitespace-nowrap text-right">
                                                Quantity (L)
                                            </th>
                                            <th className="px-3.5 py-3 whitespace-nowrap">
                                                Issued To / Operator
                                            </th>
                                            <th className="px-3.5 py-3 whitespace-nowrap">
                                                Issued By
                                            </th>
                                            <th className="px-3.5 py-3 whitespace-nowrap text-center">
                                                Source
                                            </th>
                                            <th className="px-3.5 py-3 whitespace-nowrap">
                                                Remarks / Ref
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedRows.map((row) => {
                                            const hasFlag = (row.flags ?? []).length > 0;
                                            const timeStr = row.issuedAt
                                                ? new Date(row.issuedAt).toLocaleTimeString(
                                                      'en-IN',
                                                      { hour: '2-digit', minute: '2-digit' }
                                                  )
                                                : '';
                                            const sourceBadge = SOURCE_LABELS[row.source] ?? {
                                                label: row.source,
                                                className: 'bg-slate-100 text-slate-700',
                                            };

                                            return (
                                                <tr
                                                    key={row.id}
                                                    className="hover:bg-slate-50/70 transition-colors"
                                                >
                                                    {/* Date & Time */}
                                                    <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-800">
                                                        <div>{fmtDay(row.issueDate)}</div>
                                                        {timeStr && (
                                                            <div className="text-[10px] text-slate-400 font-normal">
                                                                {timeStr}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Vehicle / Machine */}
                                                    <td className="px-3.5 py-2.5">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-semibold text-slate-800">
                                                                {row.machineName ??
                                                                    row.consumerLabel ??
                                                                    'Other'}
                                                            </span>
                                                            {row.ownershipType && (
                                                                <OwnershipBadge
                                                                    value={row.ownershipType}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                                            {row.assetCode && (
                                                                <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                                                                    {row.assetCode}
                                                                </span>
                                                            )}
                                                            {row.registrationNo && (
                                                                <span>{row.registrationNo}</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Firm / Site */}
                                                    <td className="px-3.5 py-2.5">
                                                        <div className="font-medium text-slate-700 truncate max-w-[180px]">
                                                            {row.firmName}
                                                        </div>
                                                        {row.siteLocation && (
                                                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                                                                {row.siteLocation}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Quantity */}
                                                    <td className="px-3.5 py-2.5 text-right tabular-nums whitespace-nowrap font-bold text-slate-900">
                                                        <span className="text-blue-600 font-extrabold">
                                                            {fmtNum(row.litres)}
                                                        </span>{' '}
                                                        L
                                                    </td>

                                                    {/* Operator / Issued To */}
                                                    <td className="px-3.5 py-2.5">
                                                        {row.operator ? (
                                                            <div className="flex items-center gap-1 text-slate-800 font-medium">
                                                                <User className="size-3 text-slate-400 shrink-0" />
                                                                <span className="truncate max-w-[150px]">
                                                                    {row.operator}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic">
                                                                Not specified
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Issued By */}
                                                    <td className="px-3.5 py-2.5 text-slate-600">
                                                        {row.issuedBy ? (
                                                            <span className="font-medium truncate max-w-[130px] block">
                                                                {row.issuedBy}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Source */}
                                                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                                        <span
                                                            className={cn(
                                                                'inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                                                                sourceBadge.className
                                                            )}
                                                        >
                                                            {sourceBadge.label}
                                                        </span>
                                                    </td>

                                                    {/* Remarks / Notes */}
                                                    <td className="px-3.5 py-2.5 text-slate-600 max-w-[200px]">
                                                        {row.note ? (
                                                            <span
                                                                className="truncate block text-slate-600"
                                                                title={row.note}
                                                            >
                                                                {row.note}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Table Footer with Summary and Pagination */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/70 border-t border-slate-200 text-xs">
                                <div className="text-slate-500 font-medium">
                                    Showing{' '}
                                    <span className="font-bold text-slate-800">
                                        {(currentPage - 1) * PAGE_SIZE + 1}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-bold text-slate-800">
                                        {Math.min(currentPage * PAGE_SIZE, filteredRows.length)}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-bold text-slate-800">
                                        {filteredRows.length}
                                    </span>{' '}
                                    allocations
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2.5 text-xs"
                                        disabled={currentPage <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft className="size-3.5 mr-1" />
                                        Previous
                                    </Button>
                                    <span className="px-2 font-semibold text-slate-700">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2.5 text-xs"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    >
                                        Next
                                        <ChevronRight className="size-3.5 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default DieselTransactionLedger;
