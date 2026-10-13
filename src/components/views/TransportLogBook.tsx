import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
    Truck,
    Package,
    Clock,
    CheckCircle2,
    Search,
    Download,
    RefreshCw,
    Plus,
    Pencil,
    Phone,
    FileText,
    ExternalLink,
    IndianRupee,
    Building2,
    Calendar,
    Eye,
    Upload,
    X,
    Filter,
} from 'lucide-react';
import { PuffLoader as Loader } from 'react-spinners';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { formatDate, formatDateTime, parseCustomDate, getPublicFileUrl } from '@/lib/utils';
import {
    fetchTransportLogs,
    updateTransportLogEntry,
    createTransportLogEntry,
    uploadTransportDocument,
    type TransportLogEntry,
    type TransportUpdatePayload,
    type NewTransportLogPayload,
} from '@/services/transportLogService';

export const TransportLogBook: React.FC = () => {
    const { user } = useAuth();
    const {
        selectedProjectName,
        isAllProjects,
        selectProject,
        availableProjects,
    } = useProject();

    const [logs, setLogs] = useState<TransportLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusTab, setStatusTab] = useState<'all' | 'in-transit' | 'received'>('all');
    const [selectedFirmFilter, setSelectedFirmFilter] = useState<string>(() => {
        if (!isAllProjects && selectedProjectName) {
            return selectedProjectName;
        }
        return 'all';
    });
    const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

    // Modals
    const [editingEntry, setEditingEntry] = useState<TransportLogEntry | null>(null);
    const [viewingEntry, setViewingEntry] = useState<TransportLogEntry | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState<TransportUpdatePayload>({});
    const [uploadingDocType, setUploadingDocType] = useState<'bilty' | 'challan' | null>(null);
    const biltyInputRef = useRef<HTMLInputElement>(null);
    const challanInputRef = useRef<HTMLInputElement>(null);

    // Create Form State
    const [createForm, setCreateForm] = useState<NewTransportLogPayload>({
        poNumber: '',
        indentNo: '',
        vendorName: '',
        productName: '',
        qty: 1,
        uom: 'Nos',
        firmName: '',
        vehicleNo: '',
        driverName: '',
        driverMobileNo: '',
        transporterName: '',
        transportationInclude: 'Yes',
        amount: 0,
        biltyNumber: '',
        challanNo: '',
        fromLocation: '',
        toLocation: '',
        remarks: '',
    });

    const loadData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const data = await fetchTransportLogs(user?.firm_access || []);
            setLogs(data);
        } catch (error) {
            console.error('Failed to load transport logs:', error);
            toast.error('Failed to load transport logs');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.firm_access]);

    // Unique Firms for Filter dropdown
    const availableFirms = useMemo(() => {
        const firmSet = new Set<string>();
        logs.forEach((log) => {
            if (log.firmName) firmSet.add(log.firmName.trim());
        });
        (availableProjects || []).forEach((p) => {
            if (p.name && p.id !== 'all') firmSet.add(p.name.trim());
        });
        if (selectedProjectName && !isAllProjects) {
            firmSet.add(selectedProjectName.trim());
        }
        return Array.from(firmSet).filter(Boolean).sort((a, b) => a.localeCompare(b));
    }, [logs, availableProjects, selectedProjectName, isAllProjects]);

    // Auto-select project filter when global project selection changes
    useEffect(() => {
        if (isAllProjects || !selectedProjectName) {
            setSelectedFirmFilter('all');
        } else if (selectedProjectName) {
            const matched = availableFirms.find(
                (f) => f.toLowerCase().trim() === selectedProjectName.toLowerCase().trim()
            ) || selectedProjectName;
            setSelectedFirmFilter(matched);
        }
    }, [selectedProjectName, isAllProjects, availableFirms]);

    // Handle local dropdown change (and synchronize back to global project selection)
    const handleFirmFilterChange = (val: string) => {
        setSelectedFirmFilter(val);
        if (val === 'all') {
            selectProject?.({ id: 'all', name: 'All Projects' });
        } else {
            const matchingProject = (availableProjects || []).find(
                (p) => p.name.toLowerCase().trim() === val.toLowerCase().trim()
            );
            if (matchingProject) {
                selectProject?.(matchingProject);
            }
        }
    };

    // Filter by selected project / firm
    const projectScopedLogs = useMemo(() => {
        if (selectedFirmFilter === 'all') return logs;
        const target = selectedFirmFilter.toLowerCase().trim();
        return logs.filter((item) => (item.firmName || '').toLowerCase().trim() === target);
    }, [logs, selectedFirmFilter]);

    // Filtered data calculation
    const filteredLogs = useMemo(() => {
        return projectScopedLogs.filter((item) => {
            // Status tab filter
            if (statusTab === 'in-transit' && item.status !== 'In Transit') {
                return false;
            }
            if (statusTab === 'received' && item.status === 'In Transit') {
                return false;
            }

            // Date Range filter
            if (dateRangeFilter !== 'all' && item.timestamp) {
                const itemDate = new Date(item.timestamp).getTime();
                const now = new Date().getTime();
                const oneDayMs = 24 * 60 * 60 * 1000;
                if (dateRangeFilter === 'today' && now - itemDate > oneDayMs) return false;
                if (dateRangeFilter === '7days' && now - itemDate > 7 * oneDayMs) return false;
                if (dateRangeFilter === '30days' && now - itemDate > 30 * oneDayMs) return false;
            }

            // Search query filter (matches vehicle, PO, lift, transporter, driver, product, vendor)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesVehicle = item.vehicleNo.toLowerCase().includes(q);
                const matchesPo = item.poNumber.toLowerCase().includes(q);
                const matchesLift = item.liftNumber.toLowerCase().includes(q);
                const matchesIndent = item.indentNo.toLowerCase().includes(q);
                const matchesTransporter = item.transporterName.toLowerCase().includes(q);
                const matchesDriver = item.driverName.toLowerCase().includes(q) || item.driverMobileNo.includes(q);
                const matchesProduct = item.productName.toLowerCase().includes(q);
                const matchesVendor = item.vendorName.toLowerCase().includes(q);
                const matchesBilty = (item.biltyNumber || '').toLowerCase().includes(q);
                const matchesChallan = (item.challanNo || '').toLowerCase().includes(q);

                return (
                    matchesVehicle ||
                    matchesPo ||
                    matchesLift ||
                    matchesIndent ||
                    matchesTransporter ||
                    matchesDriver ||
                    matchesProduct ||
                    matchesVendor ||
                    matchesBilty ||
                    matchesChallan
                );
            }

            return true;
        });
    }, [projectScopedLogs, statusTab, dateRangeFilter, searchQuery]);

    // KPI Metrics (scoped to selected project)
    const metrics = useMemo(() => {
        const totalConsignments = projectScopedLogs.length;
        const totalQtyTransported = projectScopedLogs.reduce((sum, item) => sum + (item.qty || 0), 0);
        const inTransitCount = projectScopedLogs.filter((i) => i.status === 'In Transit').length;
        const receivedCount = projectScopedLogs.filter((i) => i.status !== 'In Transit').length;
        const totalFreight = projectScopedLogs.reduce((sum, item) => sum + (item.amount || 0), 0);

        const uniqueVehicles = new Set(projectScopedLogs.map((i) => i.vehicleNo).filter(Boolean)).size;
        const uniqueTransporters = new Set(projectScopedLogs.map((i) => i.transporterName).filter(Boolean)).size;

        return {
            totalConsignments,
            totalQtyTransported,
            inTransitCount,
            receivedCount,
            totalFreight,
            uniqueVehicles,
            uniqueTransporters,
        };
    }, [projectScopedLogs]);

    // Export to Excel
    const handleExportExcel = () => {
        if (!filteredLogs.length) {
            toast.error('No transport records to export');
            return;
        }

        const exportRows = filteredLogs.map((log) => ({
            'Lift No': log.liftNumber,
            'Date': log.timestamp ? formatDate(parseCustomDate(log.timestamp)) : '-',
            'PO Number': log.poNumber,
            'Indent No': log.indentNo,
            'Project / Firm': log.firmName,
            'Vendor / Supplier': log.vendorName,
            'Material / Product': log.productName,
            'Quantity': log.qty,
            'UOM': log.uom || '-',
            'Vehicle Number': log.vehicleNo || 'Not Assigned',
            'Transporter': log.transporterName || '-',
            'Driver Name': log.driverName || '-',
            'Driver Contact': log.driverMobileNo || '-',
            'Bilty / LR No': log.biltyNumber || '-',
            'Challan No': log.challanNo || '-',
            'From (Origin)': log.fromLocation || '-',
            'To (Destination)': log.toLocation || '-',
            'Freight Cost (₹)': log.amount || 0,
            'Transport Included': log.transportationInclude || 'No',
            'Delivery Status': log.status,
            'Warehouse Received Date': log.actual6 ? formatDate(parseCustomDate(log.actual6)) : 'In Transit',
            'Remarks': log.remarks || '-',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transport Log');
        XLSX.writeFile(workbook, `Store_Transport_Log_Book_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success('Transport Log Book exported to Excel');
    };

    // Open Edit Modal
    const handleOpenEdit = (entry: TransportLogEntry) => {
        setEditingEntry(entry);
        setEditForm({
            vehicleNo: entry.vehicleNo,
            driverName: entry.driverName,
            driverMobileNo: entry.driverMobileNo,
            transporterName: entry.transporterName,
            transportationInclude: entry.transportationInclude,
            amount: entry.amount,
            biltyNumber: entry.biltyNumber,
            biltyImage: entry.biltyImage,
            challanNo: entry.challanNo,
            challanImage: entry.challanImage,
            fromLocation: entry.fromLocation,
            toLocation: entry.toLocation,
            materialDate: entry.materialDate || '',
            remarks: entry.remarks,
        });
    };

    // Submit Edit Form
    const handleSaveEdit = async () => {
        if (!editingEntry) return;
        setIsSaving(true);
        try {
            await updateTransportLogEntry(editingEntry.id, editForm);
            toast.success(`Transport details updated for ${editingEntry.liftNumber}`);
            setEditingEntry(null);
            loadData(true);
        } catch (error) {
            console.error('Failed to save transport update:', error);
            toast.error('Failed to update transport details');
        } finally {
            setIsSaving(false);
        }
    };

    // Upload Bilty or Challan Document
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'bilty' | 'challan') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingDocType(type);
        try {
            const url = await uploadTransportDocument(file, editingEntry?.liftNumber || 'general');
            if (type === 'bilty') {
                setEditForm((prev) => ({ ...prev, biltyImage: url }));
                toast.success('Bilty / LR image uploaded successfully');
            } else {
                setEditForm((prev) => ({ ...prev, challanImage: url }));
                toast.success('Challan image uploaded successfully');
            }
        } catch (error) {
            console.error('Failed to upload file:', error);
            toast.error('Failed to upload document');
        } finally {
            setUploadingDocType(null);
            e.target.value = '';
        }
    };

    // Create New Transport Log Entry
    const handleSaveCreate = async () => {
        if (!createForm.vehicleNo.trim()) {
            toast.error('Please enter a vehicle number');
            return;
        }
        if (!createForm.productName.trim()) {
            toast.error('Please specify the material name being transported');
            return;
        }

        setIsSaving(true);
        try {
            const generatedLiftNo = await createTransportLogEntry(createForm);
            toast.success(`Transport record logged under ${generatedLiftNo}`);
            setIsCreateOpen(false);
            // Reset form
            setCreateForm({
                poNumber: '',
                indentNo: '',
                vendorName: '',
                productName: '',
                qty: 1,
                uom: 'Nos',
                firmName: '',
                vehicleNo: '',
                driverName: '',
                driverMobileNo: '',
                transporterName: '',
                transportationInclude: 'Yes',
                amount: 0,
                biltyNumber: '',
                challanNo: '',
                fromLocation: '',
                toLocation: '',
                remarks: '',
            });
            loadData(true);
        } catch (error) {
            console.error('Failed to create transport entry:', error);
            toast.error('Failed to record transport entry');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Transport Log Book
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Comprehensive transportation registry, vehicle dispatch logs, material load details, and consignment delivery tracking.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="h-9 gap-1.5"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="h-9 gap-1.5 bg-background hover:bg-accent text-foreground"
                    >
                        <Download className="h-4 w-4" />
                        <span>Export Excel</span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => setIsCreateOpen(true)}
                        className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Record Transport</span>
                    </Button>
                </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Consignments */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Total Movements
                        </span>
                        <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Truck className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                            {metrics.totalConsignments}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Trips</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>{metrics.uniqueVehicles} Active Vehicles</span>
                        <span>•</span>
                        <span>{metrics.uniqueTransporters} Transporters</span>
                    </div>
                </div>

                {/* Total Quantity Transported */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Total Qty Transported
                        </span>
                        <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Package className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                            {metrics.totalQtyTransported.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Units</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                        Material lifted & moved from vendors
                    </div>
                </div>

                {/* In Transit */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            In Transit
                        </span>
                        <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Clock className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                            {metrics.inTransitCount}
                        </span>
                        <span className="text-[11px] text-amber-600/80">En Route</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                        Awaiting warehouse physical arrival
                    </div>
                </div>

                {/* Received / Delivered */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Delivered at Store
                        </span>
                        <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                            {metrics.receivedCount}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-medium">Completed</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                        Physical GRN & Store check verified
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Status Tabs */}
                    <Tabs
                        value={statusTab}
                        onValueChange={(val) => setStatusTab(val as any)}
                        className="w-auto"
                    >
                        <TabsList className="bg-muted/80 p-0.5 rounded-lg border border-border">
                            <TabsTrigger value="all" className="text-xs font-medium px-3 py-1.5">
                                All Logs ({projectScopedLogs.length})
                            </TabsTrigger>
                            <TabsTrigger value="in-transit" className="text-xs font-medium px-3 py-1.5">
                                In Transit ({metrics.inTransitCount})
                            </TabsTrigger>
                            <TabsTrigger value="received" className="text-xs font-medium px-3 py-1.5">
                                Delivered ({metrics.receivedCount})
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Search & Selectors */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search input */}
                        <div className="relative min-w-[240px] sm:min-w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search vehicle, PO, lift, driver, product..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs bg-background"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Firm / Project Filter */}
                        {availableFirms.length > 0 && (
                            <Select value={selectedFirmFilter} onValueChange={handleFirmFilterChange}>
                                <SelectTrigger className="h-9 text-xs w-[160px] bg-background">
                                    <SelectValue placeholder="All Projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {availableFirms.map((firm) => (
                                        <SelectItem key={firm} value={firm}>
                                            {firm}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Date Range Quick Filter */}
                        <Select
                            value={dateRangeFilter}
                            onValueChange={(val) => setDateRangeFilter(val as any)}
                        >
                            <SelectTrigger className="h-9 text-xs w-[130px] bg-background">
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dates</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                <SelectItem value="30days">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border text-[11px] uppercase tracking-wider">
                            <tr>
                                <th className="p-3.5 pl-4">Consignment / Date</th>
                                <th className="p-3.5">PO & Project</th>
                                <th className="p-3.5">Material & Quantity</th>
                                <th className="p-3.5">Vehicle & Transporter</th>
                                <th className="p-3.5">Driver Contact</th>
                                <th className="p-3.5">Bilty / Challan</th>
                                <th className="p-3.5">Freight Amount</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 pr-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader size={28} color="#2563eb" />
                                            <span>Loading transportation logs...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Truck className="size-10 text-muted-foreground/40" />
                                            <span className="font-medium text-foreground">No transport logs found</span>
                                            <span className="text-xs">
                                                {searchQuery
                                                    ? 'Try changing your search terms or filters'
                                                    : 'Material lifted from POs will appear in this log book'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((entry) => {
                                    const hasBilty = Boolean(entry.biltyNumber || entry.biltyImage);
                                    const hasChallan = Boolean(entry.challanNo || entry.challanImage);

                                    return (
                                        <tr
                                            key={entry.id}
                                            className="hover:bg-muted/40 transition-colors group"
                                        >
                                            {/* Consignment & Date */}
                                            <td className="p-3.5 pl-4 align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded w-fit text-[11px]">
                                                        {entry.liftNumber || `ID-${entry.id}`}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground mt-1">
                                                        {entry.timestamp ? formatDateTime(parseCustomDate(entry.timestamp)) : '-'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* PO & Project */}
                                            <td className="p-3.5 align-top">
                                                <div className="flex flex-col max-w-[200px]">
                                                    <span className="font-semibold text-foreground truncate" title={entry.poNumber}>
                                                        {entry.poNumber || '-'}
                                                    </span>
                                                    {entry.indentNo && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Indent: {entry.indentNo}
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] text-muted-foreground mt-0.5 font-medium truncate" title={entry.firmName}>
                                                        {entry.firmName || 'Project Site'}
                                                    </span>
                                                    {entry.vendorName && (
                                                        <span className="text-[10px] text-muted-foreground truncate" title={entry.vendorName}>
                                                            From: {entry.vendorName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Material & Quantity */}
                                            <td className="p-3.5 align-top">
                                                <div className="flex flex-col max-w-[220px]">
                                                    <span className="font-semibold text-foreground leading-tight" title={entry.productName}>
                                                        {entry.productName || 'Material'}
                                                    </span>
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                            {entry.qty.toLocaleString()} {entry.uom || ''}
                                                        </span>
                                                        {entry.receivedQuantity && entry.receivedQuantity !== entry.qty && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                (Rcvd: {entry.receivedQuantity})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Vehicle & Transporter */}
                                            <td className="p-3.5 align-top">
                                                <div className="flex flex-col">
                                                    {entry.vehicleNo ? (
                                                        <span className="font-mono font-bold text-foreground uppercase tracking-wide flex items-center gap-1 bg-muted px-2 py-0.5 rounded w-fit text-[11px]">
                                                            <Truck className="size-3 text-muted-foreground" />
                                                            {entry.vehicleNo}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-[11px]">
                                                            No vehicle assigned
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] text-muted-foreground mt-1 truncate max-w-[160px]" title={entry.transporterName}>
                                                        {entry.transporterName || 'Self / Vendor Transport'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Driver Contact */}
                                            <td className="p-3.5 align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">
                                                        {entry.driverName || '-'}
                                                    </span>
                                                    {entry.driverMobileNo ? (
                                                        <a
                                                            href={`tel:${entry.driverMobileNo}`}
                                                            className="text-blue-600 dark:text-blue-400 text-[11px] hover:underline flex items-center gap-1 mt-0.5"
                                                        >
                                                            <Phone className="size-3" />
                                                            {entry.driverMobileNo}
                                                        </a>
                                                    ) : (
                                                        <span className="text-[11px] text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Bilty / Challan */}
                                            <td className="p-3.5 align-top">
                                                <div className="flex flex-col gap-1">
                                                    {hasBilty && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] font-mono font-medium">
                                                                LR: {entry.biltyNumber || 'Attached'}
                                                            </span>
                                                            {entry.biltyImage && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => window.open(getPublicFileUrl(entry.biltyImage), '_blank')}
                                                                    className="text-blue-600 hover:text-blue-700"
                                                                    title="View Bilty"
                                                                >
                                                                    <ExternalLink className="size-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {hasChallan && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                Ch: {entry.challanNo || 'Attached'}
                                                            </span>
                                                            {entry.challanImage && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => window.open(getPublicFileUrl(entry.challanImage), '_blank')}
                                                                    className="text-blue-600 hover:text-blue-700"
                                                                    title="View Challan"
                                                                >
                                                                    <ExternalLink className="size-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!hasBilty && !hasChallan && (
                                                        <span className="text-[11px] text-muted-foreground italic">-</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Freight Amount */}
                                            <td className="p-3.5 align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">
                                                        ₹{entry.amount.toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {entry.transportationInclude === 'Yes'
                                                            ? 'Transport Inc.'
                                                            : 'Transport Extra'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-3.5 align-top">
                                                {entry.status === 'In Transit' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        In Transit
                                                    </span>
                                                ) : entry.status === 'Quality Approved' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 className="size-3" />
                                                        Delivered & Checked
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                                        <CheckCircle2 className="size-3" />
                                                        Delivered at Store
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-3.5 pr-4 align-top text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setViewingEntry(entry)}
                                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                        title="View full consignment details"
                                                    >
                                                        <Eye className="size-3.5 mr-1" />
                                                        View
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenEdit(entry)}
                                                        className="h-7 px-2 text-xs gap-1 border-border hover:bg-accent"
                                                        title="Edit vehicle & driver details"
                                                    >
                                                        <Pencil className="size-3" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer info */}
                <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground px-4">
                    <span>
                        Showing <strong className="text-foreground">{filteredLogs.length}</strong> of{' '}
                        <strong className="text-foreground">{logs.length}</strong> transport consignments
                    </span>
                    <span className="text-[11px]">
                        Last refreshed: {new Date().toLocaleTimeString()}
                    </span>
                </div>
            </div>

            {/* EDIT TRANSPORT DETAILS DIALOG */}
            <Dialog open={Boolean(editingEntry)} onOpenChange={(open) => !open && setEditingEntry(null)}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Truck className="size-5 text-blue-600" />
                            <span>Update Transport Details</span>
                        </DialogTitle>
                        <DialogDescription>
                            Update vehicle number, driver contact, bilty and carrier information for consignment{' '}
                            <strong className="text-foreground font-mono">{editingEntry?.liftNumber}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {editingEntry && (
                        <div className="space-y-4 py-2">
                            {/* Read-Only Context Banner */}
                            <div className="p-3 rounded-xl bg-muted/60 border border-border/80 text-xs space-y-1">
                                <div className="flex items-center justify-between font-semibold">
                                    <span className="text-foreground">{editingEntry.productName}</span>
                                    <span className="text-primary font-mono">{editingEntry.qty} {editingEntry.uom || ''}</span>
                                </div>
                                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                                    <span>PO: <strong className="text-foreground">{editingEntry.poNumber || '-'}</strong></span>
                                    <span>Project: <strong className="text-foreground">{editingEntry.firmName || '-'}</strong></span>
                                    <span>Vendor: <strong className="text-foreground">{editingEntry.vendorName || '-'}</strong></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Vehicle Number */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Vehicle Number *
                                    </label>
                                    <Input
                                        placeholder="e.g. MH-12-AB-1234"
                                        value={editForm.vehicleNo || ''}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, vehicleNo: e.target.value.toUpperCase() }))
                                        }
                                        className="h-9 text-xs font-mono uppercase"
                                    />
                                </div>

                                {/* Transporter Name */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Transporter / Agency
                                    </label>
                                    <Input
                                        placeholder="e.g. VRL Logistics, SafeX"
                                        value={editForm.transporterName || ''}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, transporterName: e.target.value }))
                                        }
                                        className="h-9 text-xs"
                                    />
                                </div>

                                {/* Driver Name */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Driver Name
                                    </label>
                                    <Input
                                        placeholder="Driver full name"
                                        value={editForm.driverName || ''}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, driverName: e.target.value }))
                                        }
                                        className="h-9 text-xs"
                                    />
                                </div>

                                {/* Driver Contact */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Driver Mobile No
                                    </label>
                                    <Input
                                        placeholder="10-digit mobile number"
                                        value={editForm.driverMobileNo || ''}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, driverMobileNo: e.target.value }))
                                        }
                                        className="h-9 text-xs font-mono"
                                    />
                                </div>

                                {/* Bilty / LR Number */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Bilty / LR Number
                                    </label>
                                    <Input
                                        placeholder="Consignment LR/Bilty No"
                                        value={editForm.biltyNumber || ''}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, biltyNumber: e.target.value }))
                                        }
                                        className="h-9 text-xs"
                                    />
                                </div>

                                {/* Challan Number */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Delivery Challan No
                                    </label>
                                    <Input
                                        placeholder="Challan Number"
                                        value={editForm.challanNo || ''}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, challanNo: e.target.value }))
                                        }
                                        className="h-9 text-xs"
                                    />
                                </div>

                                {/* Freight Cost */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Freight Cost (₹)
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="Freight Amount"
                                        value={editForm.amount ?? 0}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))
                                        }
                                        className="h-9 text-xs font-mono"
                                    />
                                </div>

                                {/* Transportation Included */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Transportation In PO
                                    </label>
                                    <Select
                                        value={editForm.transportationInclude || 'No'}
                                        onValueChange={(val) =>
                                            setEditForm((prev) => ({ ...prev, transportationInclude: val }))
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yes">Included in PO</SelectItem>
                                            <SelectItem value="No">Payable Extra</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Origin & Destination */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        From (Origin)
                                    </label>
                                    <Input
                                        placeholder="e.g. Factory, Pune Depot"
                                        value={editForm.fromLocation || ''}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, fromLocation: e.target.value }))
                                        }
                                        className="h-9 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        To (Destination Site)
                                    </label>
                                    <Input
                                        placeholder="e.g. Tower B Store, Site Yard"
                                        value={editForm.toLocation || ''}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, toLocation: e.target.value }))
                                        }
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Document Uploads (Bilty & Challan) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {/* Bilty Upload */}
                                <div className="border border-border/80 rounded-xl p-3 bg-muted/20">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-foreground">Bilty / LR Copy</span>
                                        {editForm.biltyImage && (
                                            <a
                                                href={getPublicFileUrl(editForm.biltyImage)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                                            >
                                                View <ExternalLink className="size-2.5" />
                                            </a>
                                        )}
                                    </div>
                                    <input
                                        ref={biltyInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => handleFileUpload(e, 'bilty')}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={uploadingDocType === 'bilty'}
                                        onClick={() => biltyInputRef.current?.click()}
                                        className="w-full text-xs h-8 gap-1.5"
                                    >
                                        {uploadingDocType === 'bilty' ? (
                                            <Loader size={12} color="currentColor" />
                                        ) : (
                                            <Upload className="size-3.5" />
                                        )}
                                        <span>{editForm.biltyImage ? 'Replace Bilty' : 'Upload Bilty'}</span>
                                    </Button>
                                </div>

                                {/* Challan Upload */}
                                <div className="border border-border/80 rounded-xl p-3 bg-muted/20">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-foreground">Challan Copy</span>
                                        {editForm.challanImage && (
                                            <a
                                                href={getPublicFileUrl(editForm.challanImage)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                                            >
                                                View <ExternalLink className="size-2.5" />
                                            </a>
                                        )}
                                    </div>
                                    <input
                                        ref={challanInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => handleFileUpload(e, 'challan')}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={uploadingDocType === 'challan'}
                                        onClick={() => challanInputRef.current?.click()}
                                        className="w-full text-xs h-8 gap-1.5"
                                    >
                                        {uploadingDocType === 'challan' ? (
                                            <Loader size={12} color="currentColor" />
                                        ) : (
                                            <Upload className="size-3.5" />
                                        )}
                                        <span>{editForm.challanImage ? 'Replace Challan' : 'Upload Challan'}</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Notes / Material Load Remarks
                                </label>
                                <Input
                                    placeholder="e.g. Dispatched 500 bags, driver instructed to deliver before 5 PM"
                                    value={editForm.remarks || ''}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, remarks: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingEntry(null)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
                        >
                            {isSaving && <Loader size={12} color="#fff" />}
                            <span>Save Changes</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RECORD NEW TRANSPORT CONSIGNMENT DIALOG */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Plus className="size-5 text-blue-600" />
                            <span>Record Transport Movement</span>
                        </DialogTitle>
                        <DialogDescription>
                            Create a transportation entry to track a vehicle dispatched with material from vendor to site.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* PO Number */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    PO Number
                                </label>
                                <Input
                                    placeholder="e.g. STORE-PO-25-26-1001"
                                    value={createForm.poNumber}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, poNumber: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Project / Firm Name */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Project / Firm Name
                                </label>
                                <Input
                                    placeholder="e.g. Skyline Towers Ltd"
                                    value={createForm.firmName}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, firmName: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Material Name */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Material / Product Name *
                                </label>
                                <Input
                                    placeholder="e.g. Portland Cement 53 Grade"
                                    value={createForm.productName}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, productName: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Quantity & UOM */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        Quantity *
                                    </label>
                                    <Input
                                        type="number"
                                        value={createForm.qty}
                                        onChange={(e) =>
                                            setCreateForm((prev) => ({ ...prev, qty: Number(e.target.value) || 0 }))
                                        }
                                        className="h-9 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1">
                                        UOM
                                    </label>
                                    <Input
                                        placeholder="Bags, MT, Nos"
                                        value={createForm.uom}
                                        onChange={(e) =>
                                            setCreateForm((prev) => ({ ...prev, uom: e.target.value }))
                                        }
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Vendor / Supplier */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Vendor / Supplier
                                </label>
                                <Input
                                    placeholder="Vendor Name"
                                    value={createForm.vendorName}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, vendorName: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Vehicle Number */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Vehicle Number *
                                </label>
                                <Input
                                    placeholder="e.g. MH-12-AB-1234"
                                    value={createForm.vehicleNo}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, vehicleNo: e.target.value.toUpperCase() }))
                                    }
                                    className="h-9 text-xs font-mono uppercase"
                                />
                            </div>

                            {/* Transporter */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Transporter / Agency
                                </label>
                                <Input
                                    placeholder="e.g. VRL Logistics"
                                    value={createForm.transporterName}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, transporterName: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Driver Mobile */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Driver Mobile No
                                </label>
                                <Input
                                    placeholder="10-digit mobile"
                                    value={createForm.driverMobileNo}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, driverMobileNo: e.target.value }))
                                    }
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            {/* Driver Name */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Driver Name
                                </label>
                                <Input
                                    placeholder="Driver name"
                                    value={createForm.driverName}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, driverName: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Freight Amount */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Freight Amount (₹)
                                </label>
                                <Input
                                    type="number"
                                    placeholder="Freight cost"
                                    value={createForm.amount}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Origin & Destination */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    From (Origin)
                                </label>
                                <Input
                                    placeholder="e.g. Pune Vendor Plant"
                                    value={createForm.fromLocation}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, fromLocation: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    To (Destination)
                                </label>
                                <Input
                                    placeholder="e.g. Project Site Yard"
                                    value={createForm.toLocation}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({ ...prev, toLocation: e.target.value }))
                                    }
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Remarks */}
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Remarks / Instructions
                            </label>
                            <Input
                                placeholder="Any special dispatch or unloading instructions"
                                value={createForm.remarks}
                                onChange={(e) =>
                                    setCreateForm((prev) => ({ ...prev, remarks: e.target.value }))
                                }
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveCreate}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
                        >
                            {isSaving && <Loader size={12} color="#fff" />}
                            <span>Record Movement</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* FULL VIEW CONSIGNMENT DETAILS DIALOG */}
            <Dialog open={Boolean(viewingEntry)} onOpenChange={(open) => !open && setViewingEntry(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Truck className="size-5 text-blue-600" />
                            <span>Transport Consignment Manifest</span>
                        </DialogTitle>
                        <DialogDescription>
                            Full transportation details for consignment{' '}
                            <strong className="text-foreground font-mono">{viewingEntry?.liftNumber}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {viewingEntry && (
                        <div className="space-y-4 py-2 text-xs">
                            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Lift Number</span>
                                    <span className="font-mono font-bold text-foreground">{viewingEntry.liftNumber}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Status</span>
                                    <span className="font-semibold text-foreground">{viewingEntry.status}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">PO Number</span>
                                    <span className="font-medium text-foreground">{viewingEntry.poNumber || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Indent No</span>
                                    <span className="font-medium text-foreground">{viewingEntry.indentNo || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Project</span>
                                    <span className="font-medium text-foreground">{viewingEntry.firmName || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Vendor</span>
                                    <span className="font-medium text-foreground">{viewingEntry.vendorName || '-'}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-muted/20 rounded-xl border border-border space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-[10px] uppercase font-semibold">Material Transported</span>
                                    <span className="font-bold text-primary text-sm">{viewingEntry.qty.toLocaleString()} {viewingEntry.uom}</span>
                                </div>
                                <div className="font-semibold text-foreground text-sm">{viewingEntry.productName}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Vehicle Number</span>
                                    <span className="font-mono font-bold text-foreground uppercase">{viewingEntry.vehicleNo || 'Not Assigned'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Transporter</span>
                                    <span className="font-medium text-foreground">{viewingEntry.transporterName || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Driver</span>
                                    <span className="font-medium text-foreground">{viewingEntry.driverName || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Driver Mobile</span>
                                    <span className="font-mono text-foreground">{viewingEntry.driverMobileNo || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Freight Charge</span>
                                    <span className="font-semibold text-foreground">₹{viewingEntry.amount.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Bilty / LR No</span>
                                    <span className="font-mono text-foreground">{viewingEntry.biltyNumber || '-'}</span>
                                </div>
                            </div>

                            {(viewingEntry.biltyImage || viewingEntry.challanImage) && (
                                <div className="flex items-center gap-2 pt-1">
                                    {viewingEntry.biltyImage && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(getPublicFileUrl(viewingEntry.biltyImage), '_blank')}
                                            className="flex-1 text-xs gap-1.5"
                                        >
                                            <FileText className="size-3.5" />
                                            <span>View Bilty Document</span>
                                        </Button>
                                    )}
                                    {viewingEntry.challanImage && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(getPublicFileUrl(viewingEntry.challanImage), '_blank')}
                                            className="flex-1 text-xs gap-1.5"
                                        >
                                            <FileText className="size-3.5" />
                                            <span>View Challan Copy</span>
                                        </Button>
                                    )}
                                </div>
                            )}

                            {viewingEntry.remarks && (
                                <div className="text-muted-foreground text-xs p-2.5 rounded-lg bg-muted/20 border border-border">
                                    <strong className="text-foreground">Remarks: </strong>
                                    {viewingEntry.remarks}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingEntry(null)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TransportLogBook;
