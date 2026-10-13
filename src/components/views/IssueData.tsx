import { type ColumnDef, type Row } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { useEffect, useState, useMemo } from 'react';
import { DownloadOutlined } from '@ant-design/icons';

import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Dialog,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { z } from 'zod';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { PuffLoader as Loader } from 'react-spinners';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ClipboardCheck, Pencil, Check, X, Trash2, Calendar } from 'lucide-react';
import Heading from '../element/Heading';
import { Input } from '../ui/input';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { useProject } from '@/context/ProjectContext';
import { openIssuePdfPreview, openGroupedIssuePdfPreview } from '@/lib/issuePdfUtils';
import { canDeleteStoreStage } from '@/lib/roleAccess';
import StageDeleteDialog from '../element/StageDeleteDialog';
import { ISSUE_KIND_LABEL, type IssueKind } from '../element/IssueKindPicker';

import {
    fetchIssueRecords,
    updateIssueApproval,
    updateIssuePlannedDate,
    resetIssueStage,
    type IssueRecord
} from '@/services/issueService';
import { filterByFirmAccess } from '@/lib/firmAccess';

// TEMP: inline planned-date editor so users can correct existing dates. Remove later.
const toInputDate = (s?: string) => {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getDateOnly = (val?: string | null): string => {
    if (!val) return '';
    const match = String(val).match(/^(\d{4}-\d{2}-\d{2})/);
    if (String(val).length === 10 && match) {
        return match[1];
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    return match ? match[1] : '';
};

const matchesRecordDate = (record: IssueRecord, selectedDate: string, tab?: string): boolean => {
    if (!selectedDate) return true;
    const pDate = getDateOnly(record.planned1);
    const aDate = getDateOnly(record.actual1);
    const tDate = getDateOnly(record.timestamp);

    if (tab === 'pending') {
        return pDate === selectedDate || (!pDate && tDate === selectedDate);
    }
    return aDate === selectedDate || pDate === selectedDate || tDate === selectedDate;
};

function EditablePlannedDate({
    record,
    onSave,
}: {
    record: IssueRecord;
    onSave: (id: number, plannedDate: string) => Promise<void>;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);

    if (!editing) {
        return (
            <div className="flex items-center gap-2">
                <span>{record.planned1 ? formatDate(new Date(record.planned1)) : '-'}</span>
                {record.id != null && (
                    <button
                        type="button"
                        title="Edit planned date"
                        className="text-primary hover:text-primary/70"
                        onClick={() => {
                            setValue(toInputDate(record.planned1));
                            setEditing(true);
                        }}
                    >
                        <Pencil size={14} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <Input
                type="date"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-8 w-36"
            />
            <button
                type="button"
                title="Save"
                disabled={saving || !value}
                className="text-green-600 hover:text-green-700 disabled:opacity-40"
                onClick={async () => {
                    setSaving(true);
                    try {
                        await onSave(record.id!, value);
                        toast.success('Planned date updated');
                        setEditing(false);
                    } catch {
                        toast.error('Failed to update planned date');
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                <Check size={16} />
            </button>
            <button
                type="button"
                title="Cancel"
                className="text-destructive hover:text-destructive/70"
                onClick={() => setEditing(false)}
            >
                <X size={16} />
            </button>
        </div>
    );
}

export default function IssueData() {
    const { user } = useAuth();
    const { effectivePermittedFirms } = useProject();
    const { updateAll } = useSheets();
    const [allData, setAllData] = useState<IssueRecord[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<IssueRecord | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<IssueRecord | null>(null);
    const [filterDate, setFilterDate] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('pending');
    // store_issue_kind_v1: filter by what the issue is for (rows without a kind are material issues)
    const [kindFilter, setKindFilter] = useState<'ALL' | IssueKind>('ALL');
    const kindOf = (i: IssueRecord): IssueKind => (i.issue_kind || 'MATERIAL') as IssueKind;
    const hasMachineKinds = allData.some((i) => kindOf(i) !== 'MATERIAL');
    const kindData = useMemo(() => (kindFilter === 'ALL' ? allData : allData.filter((i) => kindOf(i) === kindFilter)), [allData, kindFilter]);

    const fetchData = async () => {
        setDataLoading(true);
        try {
            // Pass permitted firms to the service for backend-level filtering
            const permittedFirms = effectivePermittedFirms;
            const records = await fetchIssueRecords(permittedFirms);
            setAllData(records);
        } catch (error) {
            console.error('Failed to fetch issue records:', error);
            toast.error('Failed to load data');
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [effectivePermittedFirms]);

    const returnData = useMemo(() => {
        // returns are for material issues only (a machine-part return has its own flow)
        const filtered = kindData.filter(i => kindOf(i) === 'MATERIAL' && (i.return_slip || i.return_person_name || (i.rejected_damage_qty && i.rejected_damage_qty !== '0' && i.rejected_damage_qty !== '')));
        return filterByFirmAccess(
            filtered,
            effectivePermittedFirms,
            { id: (i) => i.firm_id, name: (i) => i.firm_name }
        );
    }, [kindData, effectivePermittedFirms]);

    const pendingData = useMemo(() => {
        const filteredData = filterByFirmAccess(
            kindData.filter((item) => !item.status || item.status === 'Pending' || item.status.toLowerCase() === 'pending'),
            effectivePermittedFirms,
            { id: (i) => i.firm_id, name: (i) => i.firm_name }
        );

       return filteredData;
    }, [kindData, effectivePermittedFirms]);

    const historyData = useMemo(() => {
        const filteredData = filterByFirmAccess(
            kindData.filter((item) => ['Approved', 'Rejected', 'Yes', 'No'].includes(item.status)),
            effectivePermittedFirms,
            { id: (i) => i.firm_id, name: (i) => i.firm_name }
        );

        return filteredData;
    }, [kindData, effectivePermittedFirms]);

    const damageData = useMemo(() => {
        const filteredData = filterByFirmAccess(
            allData.filter((item) => item.status === 'Damage'),
            effectivePermittedFirms,
            { id: (i) => i.firm_id, name: (i) => i.firm_name }
        );
        return filteredData;
    }, [allData, effectivePermittedFirms]);

    const filteredPendingData = useMemo(() => {
        if (!filterDate) return pendingData;
        return pendingData.filter((item) => matchesRecordDate(item, filterDate, 'pending'));
    }, [pendingData, filterDate]);

    const filteredReturnData = useMemo(() => {
        if (!filterDate) return returnData;
        return returnData.filter((item) => matchesRecordDate(item, filterDate, 'return'));
    }, [returnData, filterDate]);

    const filteredHistoryData = useMemo(() => {
        if (!filterDate) return historyData;
        return historyData.filter((item) => matchesRecordDate(item, filterDate, 'history'));
    }, [historyData, filterDate]);

    const handleViewSlip = (type: 'issue' | 'return', clickedRecord: IssueRecord) => {
        let targetDate = filterDate;
        if (!targetDate) {
            targetDate = getDateOnly(clickedRecord.planned1) ||
                         getDateOnly(clickedRecord.actual1) ||
                         getDateOnly(clickedRecord.timestamp);
            if (targetDate) {
                setFilterDate(targetDate);
            }
        }

        let dataset: IssueRecord[];
        if (type === 'return') {
            dataset = returnData;
        } else if (activeTab === 'history') {
            dataset = historyData;
        } else if (activeTab === 'return') {
            dataset = returnData;
        } else {
            dataset = pendingData;
        }

        const matching = targetDate
            ? dataset.filter((item) => matchesRecordDate(item, targetDate, activeTab))
            : [clickedRecord];

        const recordsToPrint = matching.length > 0 ? matching : [clickedRecord];

        openGroupedIssuePdfPreview(type, recordsToPrint, targetDate);
    };

    const renderDateFilter = () => (
        <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2.5 py-1 shadow-xs">
            <Calendar size={14} className="text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filter Date:</span>
            <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-7 w-32 sm:w-36 text-xs border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer"
            />
            {filterDate && (
                <button
                    type="button"
                    onClick={() => setFilterDate('')}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
                    title="Clear date filter"
                >
                    <X size={13} />
                </button>
            )}
        </div>
    );

    const handleDownload = (data: any[]) => {
        if (!data || data.length === 0) {
            toast.error('No data to download');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map((row) =>
                headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
            ),
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `issue-data-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Update planned date of record
    const handleSavePlannedDate = async (id: number, plannedDate: string) => {
        await updateIssuePlannedDate(id, plannedDate);
        setAllData((prev) =>
            prev.map((r) => (r.id === id ? { ...r, planned1: plannedDate } : r))
        );
    };

    const columns: ColumnDef<IssueRecord>[] = useMemo(() => {
        const actionCol: ColumnDef<IssueRecord>[] = user.issueData
            ? [
                {
                    header: 'Action',
                    id: 'action',
                    cell: ({ row }: { row: Row<IssueRecord> }) => {
                        const indent = row.original;
                        return (
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedIssue(indent);
                                        setOpenDialog(true);
                                    }}
                                >
                                    Approve
                                </Button>
                            </DialogTrigger>
                        );
                    },
                },
            ]
            : [];

        const plannedDateCol: ColumnDef<IssueRecord> = {
            accessorKey: 'planned1',
            header: 'Planned Date',
            cell: ({ row }) => <EditablePlannedDate record={row.original} onSave={handleSavePlannedDate} />,
        };

        const issueSlipCol: ColumnDef<IssueRecord> = {
            accessorKey: 'issue_slip',
            header: 'Issue Slip',
            cell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => handleViewSlip('issue', row.original)}
                    className="text-primary hover:underline font-medium cursor-pointer"
                >
                    View
                </button>
            ),
        };

        if (kindFilter === 'ASSET_DIESEL') {
            return [
                ...actionCol,
                { accessorKey: 'issue_no', header: 'Issue No' },
                { accessorKey: 'machine_name', header: 'Machine Name', cell: ({ row }) => row.original.machine_name || row.original.machine_id || '-' },
                { accessorKey: 'site_location', header: 'Site Location', cell: ({ row }) => row.original.site_location || '-' },
                { accessorKey: 'constructor_name', header: 'Receiver (Operator)', cell: ({ row }) => row.original.constructor_name || '-' },
                { accessorKey: 'product_name', header: 'Product Name' },
                { accessorKey: 'quantity', header: 'Quantity' },
                { accessorKey: 'uom', header: 'UOM' },
                { accessorKey: 'issue_person_name', header: 'Issued By', cell: ({ row }) => row.original.issue_person_name || '-' },
                { accessorKey: 'firm_name', header: 'Project / Firm' },
                { accessorKey: 'issue_to', header: 'Remarks', cell: ({ row }) => row.original.issue_to || '-' },
                plannedDateCol,
                issueSlipCol,
            ];
        }

        if (kindFilter === 'MAINTENANCE') {
            return [
                ...actionCol,
                { accessorKey: 'issue_no', header: 'Issue No' },
                { accessorKey: 'machine_name', header: 'Machine', cell: ({ row }) => row.original.machine_name || row.original.machine_id || '-' },
                { accessorKey: 'product_name', header: 'Part / Product Name' },
                { accessorKey: 'group_head', header: 'Group Head' },
                { accessorKey: 'quantity', header: 'Quantity' },
                { accessorKey: 'uom', header: 'UOM' },
                { accessorKey: 'issue_person_name', header: 'Issued By', cell: ({ row }) => row.original.issue_person_name || '-' },
                { accessorKey: 'firm_name', header: 'Project / Firm' },
                { accessorKey: 'issue_to', header: 'Remarks', cell: ({ row }) => row.original.issue_to || '-' },
                plannedDateCol,
                issueSlipCol,
            ];
        }

        if (kindFilter === 'MATERIAL') {
            return [
                ...actionCol,
                { accessorKey: 'issue_no', header: 'Issue No' },
                { accessorKey: 'product_name', header: 'Product Name' },
                { accessorKey: 'group_head', header: 'Group Head' },
                { accessorKey: 'quantity', header: 'Quantity' },
                { accessorKey: 'uom', header: 'UOM' },
                { accessorKey: 'location', header: 'Location' },
                { accessorKey: 'constructor_name', header: 'Contractor Name', cell: ({ row }) => row.original.constructor_name || '-' },
                { accessorKey: 'site_location', header: 'Site Location', cell: ({ row }) => row.original.site_location || '-' },
                { accessorKey: 'issue_person_name', header: 'Issued By', cell: ({ row }) => row.original.issue_person_name || '-' },
                { accessorKey: 'firm_name', header: 'Project Name' },
                { accessorKey: 'issue_to', header: 'Issue Remark', cell: ({ row }) => row.original.issue_to || '-' },
                plannedDateCol,
                issueSlipCol,
            ];
        }

        return [
            ...actionCol,
            { accessorKey: 'issue_no', header: 'Issue No' },
            ...(hasMachineKinds
                ? [
                    {
                        id: 'issue_kind',
                        header: 'Kind',
                        cell: ({ row }: { row: Row<IssueRecord> }) => {
                            const k = kindOf(row.original);
                            return <span className={k === 'MATERIAL' ? 'text-xs text-slate-600' : 'text-xs font-semibold text-primary'}>{ISSUE_KIND_LABEL[k]}</span>;
                        },
                    },
                    { accessorKey: 'machine_name', header: 'Machine', cell: ({ row }: { row: Row<IssueRecord> }) => row.original.machine_name || row.original.machine_id || '-' },
                ]
                : []),
            { accessorKey: 'issue_to', header: 'Issue Remark' },
            { accessorKey: 'group_head', header: 'Group Head' },
            { accessorKey: 'uom', header: 'Uom' },
            { accessorKey: 'product_name', header: 'Product Name' },
            { accessorKey: 'quantity', header: 'Quantity' },
            { accessorKey: 'location', header: 'Location' },
            { accessorKey: 'constructor_name', header: 'Contractor / Receiver', cell: ({ row }: { row: Row<IssueRecord> }) => row.original.constructor_name || '-' },
            { accessorKey: 'site_location', header: 'Site Location', cell: ({ row }: { row: Row<IssueRecord> }) => row.original.site_location || '-' },
            { accessorKey: 'issue_person_name', header: 'Issued By', cell: ({ row }) => row.original.issue_person_name || '-' },
            { accessorKey: 'firm_name', header: 'Project Name' },
            plannedDateCol,
            issueSlipCol,
        ];
    }, [user.issueData, kindFilter, hasMachineKinds]);

    const historyColumns: ColumnDef<IssueRecord>[] = useMemo(() => {
        const plannedDateCol: ColumnDef<IssueRecord> = {
            accessorKey: 'planned1',
            header: 'Planned Date',
            cell: ({ row }) => <EditablePlannedDate record={row.original} onSave={handleSavePlannedDate} />,
        };

        const actualDateCol: ColumnDef<IssueRecord> = {
            accessorKey: 'actual1',
            header: 'Actual Date',
            cell: ({ row }) => (row.original.actual1 ? formatDate(new Date(row.original.actual1)) : '-'),
        };

        const issueSlipCol: ColumnDef<IssueRecord> = {
            accessorKey: 'issue_slip',
            header: 'Issue Slip',
            cell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => handleViewSlip('issue', row.original)}
                    className="text-primary hover:underline font-medium cursor-pointer"
                >
                    View
                </button>
            ),
        };

        const actionsCol: ColumnDef<IssueRecord> = {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const record = row.original;
                const canDelete = canDeleteStoreStage(user, 'store_data');
                if (!canDelete) return null;

                return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(record)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 h-8 px-2 text-xs"
                            title="Reset Issue Approval to Pending"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </Button>
                    </div>
                );
            },
        };

        if (kindFilter === 'ASSET_DIESEL') {
            return [
                { accessorKey: 'issue_no', header: 'Issue No' },
                { accessorKey: 'machine_name', header: 'Machine Name', cell: ({ row }) => row.original.machine_name || row.original.machine_id || '-' },
                { accessorKey: 'site_location', header: 'Site Location', cell: ({ row }) => row.original.site_location || '-' },
                { accessorKey: 'constructor_name', header: 'Receiver (Operator)', cell: ({ row }) => row.original.constructor_name || '-' },
                { accessorKey: 'product_name', header: 'Product Name' },
                { accessorKey: 'quantity', header: 'Quantity' },
                { accessorKey: 'uom', header: 'UOM' },
                { accessorKey: 'issue_person_name', header: 'Issued By', cell: ({ row }) => row.original.issue_person_name || '-' },
                { accessorKey: 'firm_name', header: 'Project / Firm' },
                { accessorKey: 'issue_to', header: 'Remarks', cell: ({ row }) => row.original.issue_to || '-' },
                { accessorKey: 'status', header: 'Status' },
                { accessorKey: 'given_qty', header: 'Given Qty' },
                plannedDateCol,
                actualDateCol,
                issueSlipCol,
                actionsCol,
            ];
        }

        if (kindFilter === 'MAINTENANCE') {
            return [
                { accessorKey: 'issue_no', header: 'Issue No' },
                { accessorKey: 'machine_name', header: 'Machine', cell: ({ row }) => row.original.machine_name || row.original.machine_id || '-' },
                { accessorKey: 'product_name', header: 'Part / Product Name' },
                { accessorKey: 'group_head', header: 'Group Head' },
                { accessorKey: 'quantity', header: 'Quantity' },
                { accessorKey: 'uom', header: 'UOM' },
                { accessorKey: 'issue_person_name', header: 'Issued By', cell: ({ row }) => row.original.issue_person_name || '-' },
                { accessorKey: 'firm_name', header: 'Project / Firm' },
                { accessorKey: 'issue_to', header: 'Remarks', cell: ({ row }) => row.original.issue_to || '-' },
                { accessorKey: 'status', header: 'Status' },
                { accessorKey: 'given_qty', header: 'Given Qty' },
                plannedDateCol,
                actualDateCol,
                issueSlipCol,
                actionsCol,
            ];
        }

        if (kindFilter === 'MATERIAL') {
            return [
                { accessorKey: 'issue_no', header: 'Issue No' },
                { accessorKey: 'product_name', header: 'Product Name' },
                { accessorKey: 'group_head', header: 'Group Head' },
                { accessorKey: 'quantity', header: 'Quantity' },
                { accessorKey: 'uom', header: 'UOM' },
                { accessorKey: 'location', header: 'Location' },
                { accessorKey: 'constructor_name', header: 'Contractor Name', cell: ({ row }) => row.original.constructor_name || '-' },
                { accessorKey: 'site_location', header: 'Site Location', cell: ({ row }) => row.original.site_location || '-' },
                { accessorKey: 'issue_person_name', header: 'Issued By', cell: ({ row }) => row.original.issue_person_name || '-' },
                { accessorKey: 'firm_name', header: 'Project Name' },
                { accessorKey: 'issue_to', header: 'Issue Remark', cell: ({ row }) => row.original.issue_to || '-' },
                { accessorKey: 'status', header: 'Status' },
                { accessorKey: 'given_qty', header: 'Given Qty' },
                plannedDateCol,
                actualDateCol,
                issueSlipCol,
                actionsCol,
            ];
        }

        return [
            { accessorKey: 'issue_no', header: 'Issue No' },
            ...(hasMachineKinds
                ? [
                    {
                        id: 'issue_kind',
                        header: 'Kind',
                        cell: ({ row }: { row: Row<IssueRecord> }) => {
                            const k = kindOf(row.original);
                            return <span className={k === 'MATERIAL' ? 'text-xs text-slate-600' : 'text-xs font-semibold text-primary'}>{ISSUE_KIND_LABEL[k]}</span>;
                        },
                    },
                    { accessorKey: 'machine_name', header: 'Machine', cell: ({ row }: { row: Row<IssueRecord> }) => row.original.machine_name || row.original.machine_id || '-' },
                ]
                : []),
            { accessorKey: 'issue_to', header: 'Issue Remark' },
            { accessorKey: 'group_head', header: 'Group Head' },
            { accessorKey: 'uom', header: 'Uom' },
            { accessorKey: 'product_name', header: 'Product Name' },
            { accessorKey: 'quantity', header: 'Quantity' },
            { accessorKey: 'location', header: 'Location' },
            { accessorKey: 'constructor_name', header: 'Contractor / Receiver', cell: ({ row }: { row: Row<IssueRecord> }) => row.original.constructor_name || '-' },
            { accessorKey: 'site_location', header: 'Site Location', cell: ({ row }: { row: Row<IssueRecord> }) => row.original.site_location || '-' },
            { accessorKey: 'issue_person_name', header: 'Issued By', cell: ({ row }) => row.original.issue_person_name || '-' },
            { accessorKey: 'firm_name', header: 'Project Name' },
            { accessorKey: 'status', header: 'Status' },
            { accessorKey: 'given_qty', header: 'Given Qty' },
            plannedDateCol,
            actualDateCol,
            issueSlipCol,
            actionsCol,
        ];
    }, [user, kindFilter, hasMachineKinds]);


    const returnColumns: ColumnDef<IssueRecord>[] = [
        { accessorKey: 'issue_no', header: 'Issue No' },
        { accessorKey: 'issue_to', header: 'Issue Remark' },
        { accessorKey: 'group_head', header: 'Group Head' },
        { accessorKey: 'product_name', header: 'Product Name' },
        { accessorKey: 'quantity', header: 'Issue Qty' },
        { accessorKey: 'rejected_damage_qty', header: 'Reject/Damage Qty' },
        { accessorKey: 'damage_remark', header: 'Damage Remark' },
        { accessorKey: 'return_person_name', header: 'Return Person' },
        { accessorKey: 'issue_person_name', header: 'Issue Person' },
        { accessorKey: 'constructor_name', header: 'Contractor' },
        { accessorKey: 'site_location', header: 'Site' },
        { accessorKey: 'firm_name', header: 'Project' },
        {
            accessorKey: 'actual1',
            header: 'Return Date',
            cell: ({ row }) => (row.original.actual1 ? formatDate(new Date(row.original.actual1)) : '-'),
        },
        {
            accessorKey: 'issue_slip',
            header: 'Issue Slip',
            cell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => handleViewSlip('issue', row.original)}
                    className="text-primary hover:underline font-medium cursor-pointer"
                >
                    View
                </button>
            ),
        },
        {
            accessorKey: 'return_slip',
            header: 'Return Slip',
            cell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => handleViewSlip('return', row.original)}
                    className="text-primary hover:underline font-medium cursor-pointer"
                >
                    View
                </button>
            ),
        },
    ];

    const schema = z.object({
        status: z.enum(['Yes', 'No'], {
            required_error: 'Please select a status',
        }),
        givenQty: z.number().optional(),
    }).superRefine((data, ctx) => {
        if (data.status === 'Yes' && (!data.givenQty || data.givenQty <= 0)) {
            ctx.addIssue({
                path: ['givenQty'],
                code: z.ZodIssueCode.custom,
                message: 'Given quantity is required when status is Yes',
            });
        }

        if (data.status === 'Yes' && data.givenQty && selectedIssue && data.givenQty > selectedIssue.quantity) {
            ctx.addIssue({
                path: ['givenQty'],
                code: z.ZodIssueCode.custom,
                message: `Given quantity cannot exceed requested quantity (${selectedIssue.quantity})`,
            });
        }
    });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { givenQty: undefined, status: undefined },
    });

    useEffect(() => {
        if (selectedIssue) {
            form.reset({
                status: 'Yes',
                givenQty: selectedIssue.quantity
            });
        }
    }, [selectedIssue, form]);

    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            if (!selectedIssue) return;

            const currentDateTime = new Date().toISOString();
            const givenQtyVal = values.status === 'Yes' ? values.givenQty : null;

            await updateIssueApproval(selectedIssue.issue_no, {
                actual1: currentDateTime,
                status: values.status === 'Yes' ? 'Approved' : 'Rejected',
                given_qty: givenQtyVal,
                product_name: selectedIssue.product_name,
                firm_id: selectedIssue.firm_id,
                firm_name: selectedIssue.firm_name,
                previous_given_qty: selectedIssue.given_qty || 0,
            });

            toast.success(`Updated approval status of ${selectedIssue.issue_no}`);
            setOpenDialog(false);
            form.reset();
            setSelectedIssue(null);
            await fetchData();
            updateAll(true);
        } catch (err) {
            console.error('Error updating approval', err);
            toast.error('Failed to update issue');
        }
    }

    function onError(e: FieldErrors<z.infer<typeof schema>>) {
        console.error(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Heading
                        heading="Store Data"
                        subtext="Store Data"
                        tabs
                        pendingCount={filteredPendingData.length}
                        returnCount={filteredReturnData.length}
                        historyCount={filteredHistoryData.length}
                        returnValue="return"
                    >
                        <ClipboardCheck size={50} className="text-primary" />
                    </Heading>

                    {filterDate && (
                        <div className="mx-3 sm:mx-5 mt-3 mb-1 flex items-center justify-between bg-blue-50/90 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg shadow-xs">
                            <span className="flex items-center gap-2 font-medium">
                                <Calendar size={14} className="text-blue-600 shrink-0" />
                                <span>
                                    Filtered by Date: <strong className="font-semibold">{formatDate(new Date(filterDate))}</strong>
                                    <span className="text-blue-600 ml-1.5 font-normal">
                                        ({activeTab === 'pending' ? filteredPendingData.length : activeTab === 'return' ? filteredReturnData.length : filteredHistoryData.length} record{((activeTab === 'pending' ? filteredPendingData.length : activeTab === 'return' ? filteredReturnData.length : filteredHistoryData.length) === 1 ? '' : 's')} in this tab)
                                    </span>
                                </span>
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFilterDate('')}
                                className="h-6 px-2 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                            >
                                Clear Filter
                            </Button>
                        </div>
                    )}

                    {allData.length > 0 && (
                        <div className="mx-3 sm:mx-5 mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Kind:</span>
                            {(['ALL', 'MATERIAL', 'MAINTENANCE', 'ASSET_DIESEL'] as const).map((k) => (
                                <Button
                                    key={k}
                                    type="button"
                                    size="sm"
                                    variant={kindFilter === k ? 'default' : 'outline'}
                                    className="h-7 px-3 text-xs"
                                    onClick={() => setKindFilter(k)}
                                >
                                    {k === 'ALL' ? 'All' : ISSUE_KIND_LABEL[k]}
                                </Button>
                            ))}
                        </div>
                    )}

                    <TabsContent value="pending">
                        <DataTable
                            data={filteredPendingData}
                            columns={columns}
                            searchFields={['product_name', 'issue_no', 'issue_to', 'constructor_name', 'site_location', 'firm_name', 'machine_name', 'work_order_code']}
                            dataLoading={dataLoading}
                            extraActions={
                                <div className="flex items-center gap-2">
                                    {renderDateFilter()}
                                    <Button
                                        variant="default"
                                        onClick={() => handleDownload(filteredPendingData)}
                                        style={{
                                            background: 'linear-gradient(90deg, #4CAF50, #2E7D32)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '0 16px',
                                            fontWeight: 'bold',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        <DownloadOutlined />
                                        {downloading ? 'Downloading...' : 'Download'}
                                    </Button>
                                </div>
                            }
                        />
                    </TabsContent>
                    <TabsContent value="return">
                        <DataTable
                            data={filteredReturnData}
                            columns={returnColumns}
                            searchFields={['product_name', 'issue_no', 'issue_to', 'constructor_name', 'site_location', 'firm_name', 'return_person_name']}
                            dataLoading={dataLoading}
                            extraActions={
                                <div className="flex items-center gap-2">
                                    {renderDateFilter()}
                                </div>
                            }
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={filteredHistoryData}
                            columns={historyColumns}
                            searchFields={['product_name', 'issue_no', 'issue_to', 'constructor_name', 'site_location', 'firm_name']}
                            dataLoading={dataLoading}
                            extraActions={
                                <div className="flex items-center gap-2">
                                    {renderDateFilter()}
                                    <Button
                                        variant="default"
                                        onClick={() => handleDownload(filteredHistoryData)}
                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 border-none rounded-lg font-bold shadow-md flex items-center gap-2 px-4"
                                    >
                                        <DownloadOutlined />
                                        Download History
                                    </Button>
                                </div>
                            }
                        />
                    </TabsContent>
                </Tabs>

                {selectedIssue && (
                    <DialogContent>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="grid gap-5"
                            >
                                <DialogHeader className="grid gap-2">
                                    <DialogTitle>Approve issue</DialogTitle>
                                    <DialogDescription>
                                        Approve issue{' '}
                                        <span className="font-medium">{selectedIssue.issue_no}</span>
                                        {selectedIssue.machine_name && (
                                            <span className="block text-xs text-muted-foreground">
                                                {selectedIssue.machine_name}
                                                {selectedIssue.work_order_code ? ` · ${selectedIssue.work_order_code}` : ''}
                                                {selectedIssue.meter_reading != null ? ` · reading ${selectedIssue.meter_reading}${selectedIssue.machine_unit === 'HOURS' ? ' hrs' : selectedIssue.machine_unit === 'KM' ? ' km' : ''}` : ''}
                                                {' · '}{selectedIssue.quantity} {selectedIssue.uom || ''} requested
                                            </span>
                                        )}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-3">
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select approval status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Yes">Yes</SelectItem>
                                                        <SelectItem value="No">No</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch('status') === 'Yes' && (
                                        <FormField
                                            control={form.control}
                                            name="givenQty"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Given Quantity</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            type="number"
                                                            onChange={(e) =>
                                                                field.onChange(Number(e.target.value))
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Close</Button>
                                    </DialogClose>

                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                    >
                                        {form.formState.isSubmitting && (
                                            <Loader
                                                size={20}
                                                color="white"
                                                aria-label="Loading Spinner"
                                            />
                                        )}
                                        Approve
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}
            </Dialog>

            <StageDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                stageName="Store Issue Approval"
                isPermanentDelete={false}
                indentNumber={deleteTarget?.issue_no}
                productName={deleteTarget?.product_name}
                customMessage={`Are you sure you want to delete approval for Issue ${deleteTarget?.issue_no} (${deleteTarget?.product_name})? This will revert the issue back to Pending state.`}
                onConfirm={async () => {
                    if (!deleteTarget || !deleteTarget.id) return;
                    const targetId = deleteTarget.id;
                    const issueNum = deleteTarget.issue_no;
                    await resetIssueStage(targetId);
                    toast.success(`Issue ${issueNum} approval reset to Pending`);
                    setDeleteTarget(null);
                    setAllData(prev => prev.map(r => r.id === targetId ? { ...r, status: 'Pending', planned1: '', actual1: '' } : r));
                    await fetchData();
                    updateAll(true);
                }}
            />
        </div>
    );
}

