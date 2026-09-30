import Heading from '../element/Heading';
import {
    Calendar as CalendarIcon,
    ClipboardList,
    LayoutDashboard,
    PackageCheck,
    Truck,
    Warehouse,
    CreditCard,
    Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '../ui/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { ComboBox } from '../ui/combobox';
import { fetchIndentRecords, type IndentRecord } from '@/services/indentService';
import { fetchStoreInRecords, type StoreInRecord } from '@/services/storeInService';
import { fetchIssueRecords, type IssueRecord } from '@/services/issueService';
import { insertMasterData, fetchMasterOptions } from '@/services/masterService';
import { fetchPoMaster, type PoMasterRecord } from '@/services/poService';
import { fetchInventoryRecords, type InventoryRecord } from '@/services/inventoryService';
import { Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { useSheets } from '@/context/SheetsContext';
import { useProject } from '@/context/ProjectContext';
import { Database, Plus, Save, Building2, Search, X, ChevronRight, Eye, Package, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { isAllowedFirm } from '@/lib/firmAccess';
import { openPoPdfPreview } from '@/lib/poPdfUtils';
import { formatDate } from '@/lib/utils';

interface ChartDataItem {
    name: string;
    quantity: number;
    frequency: number;
}

export default function Dashboard() {
    const {
        pcReportSheet,
        allLoading: contextAllLoading
    } = useSheets();
    const { user } = useAuth();
    const { effectivePermittedFirms, selectedProject, isAllProjects } = useProject();

    const [indents, setIndents] = useState<IndentRecord[]>([]);
    const [storeIns, setStoreIns] = useState<StoreInRecord[]>([]);
    const [issues, setIssues] = useState<IssueRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [topVendorsData, setTopVendors] = useState<VendorDataItem[]>([]);
    const [allVendorsValuationData, setAllVendorsValuationData] = useState<VendorDataItem[]>([]);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [vendorSearchQuery, setVendorSearchQuery] = useState('');
    const [vendorSortBy, setVendorSortBy] = useState<'value-desc' | 'value-asc' | 'orders-desc' | 'name-asc'>('value-desc');
    const [selectedVendorForDetails, setSelectedVendorForDetails] = useState<string | null>(null);
    const [isVendorDetailsModalOpen, setIsVendorDetailsModalOpen] = useState(false);
    const [orderSearchQuery, setOrderSearchQuery] = useState('');
    const [indent, setIndent] = useState<StatsData>({ count: 0, quantity: 0 });
    const [purchase, setPurchase] = useState<StatsData>({ count: 0, quantity: 0 });
    const [out, setOut] = useState<StatsData>({ count: 0, quantity: 0 });
    const [poTotal, setPoTotal] = useState<number>(0);
    const [poMasterData, setPoMasterData] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<AlertsData>({ lowStock: 0, outOfStock: 0 });

    const [trendData, setTrendData] = useState<TrendDataItem[]>([]);
    const [deptData, setDeptData] = useState<DeptDataItem[]>([]);
    const [statusData, setStatusData] = useState<StatusDataItem[]>([]);

    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [filteredVendors, setFilteredVendors] = useState<string[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<string[]>([]);
    const [filteredDepartments, setFilteredDepartments] = useState<string[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<string[]>([]);
    const [allVendors, setAllVendors] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<string[]>([]);
    const [allDepartments, setAllDepartments] = useState<string[]>([]);
    const [allProjects, setAllProjects] = useState<string[]>([]);
    const [masterColumn, setMasterColumn] = useState('');
    const [masterValue, setMasterValue] = useState('');
    const [isInserting, setIsInserting] = useState(false);

    const hasFirmAccess = (row: any) =>
        isAllowedFirm(
            {
                id: row?.firm_id ?? row?.firmId,
                name: row?.firmNameMatch ?? row?.firm_name ?? row?.firmName ?? row?.projectName,
            },
            effectivePermittedFirms
        );

    // Synchronize local project filter with global selected project
    useEffect(() => {
        if (!isAllProjects && selectedProject?.name && selectedProject.id !== 'all') {
            setFilteredProjects([selectedProject.name]);
        } else if (isAllProjects) {
            setFilteredProjects([]);
        }
    }, [selectedProject, isAllProjects]);

    // Number formatting helpers
    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
        return `₹${val.toLocaleString()}`;
    };

    const formatQty = (val: number) => {
        if (val >= 100000) return `${(val / 100000).toFixed(2)}L`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toLocaleString();
    };

    const processedModalVendors = useMemo(() => {
        let list = [...allVendorsValuationData];
        if (vendorSearchQuery.trim()) {
            const q = vendorSearchQuery.toLowerCase().trim();
            list = list.filter((v) => v.name.toLowerCase().includes(q));
        }

        switch (vendorSortBy) {
            case 'value-asc':
                list.sort((a, b) => a.quantity - b.quantity);
                break;
            case 'orders-desc':
                list.sort((a, b) => b.orders - a.orders);
                break;
            case 'name-asc':
                list.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'value-desc':
            default:
                list.sort((a, b) => b.quantity - a.quantity);
                break;
        }

        return list;
    }, [allVendorsValuationData, vendorSearchQuery, vendorSortBy]);

    const modalTotalValuation = useMemo(() => {
        return allVendorsValuationData.reduce((sum, v) => sum + v.quantity, 0);
    }, [allVendorsValuationData]);

    const modalTotalOrders = useMemo(() => {
        return allVendorsValuationData.reduce((sum, v) => sum + v.orders, 0);
    }, [allVendorsValuationData]);

    const selectedVendorItems = useMemo(() => {
        if (!selectedVendorForDetails) return [];
        const normName = selectedVendorForDetails.trim().toLowerCase();
        return poMasterData.filter(
            (item) => String(item.partyName || '').trim().toLowerCase() === normName
        );
    }, [poMasterData, selectedVendorForDetails]);

    const selectedVendorGroupedOrders = useMemo(() => {
        const map = new Map<string, {
            poNumber: string;
            timestamp: string;
            firmName: string;
            firmId?: number;
            indentNumber?: string;
            deliveryDate: string;
            paymentTerms: string;
            totalPoAmount: number;
            items: any[];
        }>();

        selectedVendorItems.forEach((item) => {
            const poNo = item.poNumber || item.internalCode || 'N/A';
            const firmKey = item.firm_id != null ? String(item.firm_id) : (item.firmNameMatch || '');
            const indentKey = item.internalCode || (item as any).internal_code || '';
            const key = `${poNo}__${firmKey}__${indentKey}`;
            if (!map.has(key)) {
                map.set(key, {
                    poNumber: poNo,
                    timestamp: item.timestamp,
                    firmName: item.firmNameMatch || '',
                    firmId: item.firm_id != null ? Number(item.firm_id) : undefined,
                    indentNumber: indentKey || undefined,
                    deliveryDate: item.deliveryDate || '',
                    paymentTerms: item.paymentTerms || '',
                    totalPoAmount: Number(item.totalPoAmount) || 0,
                    items: [],
                });
            }
            map.get(key)!.items.push(item);
        });

        return Array.from(map.values());
    }, [selectedVendorItems]);

    const selectedVendorTotalValuation = useMemo(() => {
        return selectedVendorGroupedOrders.reduce((sum, order) => {
            const val = order.totalPoAmount || order.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
            return sum + val;
        }, 0);
    }, [selectedVendorGroupedOrders]);

    const filteredVendorOrders = useMemo(() => {
        if (!orderSearchQuery.trim()) return selectedVendorGroupedOrders;
        const q = orderSearchQuery.toLowerCase().trim();
        return selectedVendorGroupedOrders.filter((order) => {
            const matchPo = order.poNumber.toLowerCase().includes(q);
            const matchFirm = order.firmName.toLowerCase().includes(q);
            const matchItems = order.items.some(
                (item) =>
                    String(item.product || '').toLowerCase().includes(q) ||
                    String(item.internalCode || '').toLowerCase().includes(q)
            );
            return matchPo || matchFirm || matchItems;
        });
    }, [selectedVendorGroupedOrders, orderSearchQuery]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [iData, sData, issueData, mData, poData, invData] = await Promise.all([
                    fetchIndentRecords(effectivePermittedFirms),
                    fetchStoreInRecords(effectivePermittedFirms),
                    fetchIssueRecords(effectivePermittedFirms),
                    fetchMasterOptions(effectivePermittedFirms),
                    fetchPoMaster(effectivePermittedFirms),
                    fetchInventoryRecords(effectivePermittedFirms)
                ]);
                // Service calls already apply firm_id access filtering.
                // Keep a defensive local gate so dashboard remains correct
                // even if any upstream query regresses during migration.
                const filteredIData = iData.filter((r: any) => hasFirmAccess(r));
                const filteredSData = sData.filter((r: any) => hasFirmAccess(r));
                const filteredIssueData = issueData.filter((r: any) => hasFirmAccess(r));
                const filteredPoData = poData.filter((r: any) => hasFirmAccess(r));
                const filteredAllProjects = mData.firms;

                setIndents(filteredIData);
                setStoreIns(filteredSData);
                setIssues(filteredIssueData);
                setAllVendors(mData.vendorNames);
                // setAllDepartments(mData.departments);
                setAllProjects(filteredAllProjects);
                setPoMasterData(filteredPoData);

                // Initial total PO calculations (grouped by unique PO to avoid duplicating line item totals)
                const poMapInit = new Map<string, number>();
                filteredPoData.forEach((item: any) => {
                    const poNo = item.poNumber || item.internalCode || 'N/A';
                    const vendorName = String(item.partyName || '').trim();
                    const key = `${vendorName}||${poNo}`;
                    if (!poMapInit.has(key)) {
                        poMapInit.set(key, Number(item.totalPoAmount) || Number(item.amount) || 0);
                    }
                });
                const totalVal = Array.from(poMapInit.values()).reduce((sum, val) => sum + val, 0);
                setPoTotal(totalVal);

                // Calculate stock alerts from inventory for permitted project(s)
                const filteredInv = invData.filter((i: InventoryRecord) => hasFirmAccess(i));
                const low = filteredInv.filter((i: InventoryRecord) => (i.current || 0) < 5 && (i.current || 0) > 0).length;
                const outOf = filteredInv.filter((i: InventoryRecord) => (i.current || 0) <= 0).length;
                setAlerts({ lowStock: low, outOfStock: outOf });

            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user?.username, effectivePermittedFirms]);

    useEffect(() => {
        if (isLoading) return;

        // Get unique products from Indents

        const products = Array.from(
            new Set(
                indents
                    .filter((item) => item.product_name)
                    .map((item) => item.product_name || '')
            )
        );
        setAllProducts(products);

        // Filter data by date range, vendors, and products
        const filterByDateAndSelection = (item: IndentRecord) => {
            let valid = true;

            if (startDate && item.actual1) {
                const itemDate = new Date(item.actual1);
                valid = valid && itemDate >= startDate;
            }

            if (endDate && item.actual1) {
                const itemDate = new Date(item.actual1);
                valid = valid && itemDate <= endDate;
            }

            if (filteredVendors.length > 0 && item.vendor_name) {
                valid = valid && filteredVendors.includes(String(item.vendor_name));
            }

            if (filteredProducts.length > 0 && item.product_name) {
                valid = valid && filteredProducts.includes(item.product_name);
            }

            /* if (filteredDepartments.length > 0 && item.department) {
                valid = valid && filteredDepartments.includes(item.department);
            } */
            if (filteredProjects.length > 0 && item.firm_name) {
                valid = valid && filteredProjects.includes(item.firm_name);
            }

            return valid;
        };

        // Calculate Approved Indents (actual1 is filled)
        const approvedIndents = indents.filter(
            (item) => item.actual1 && filterByDateAndSelection(item)
        );
        const totalApprovedQuantity = approvedIndents.reduce(
            (sum, item) => sum + (item.approved_quantity || 0),
            0
        );
        setIndent({ count: approvedIndents.length, quantity: totalApprovedQuantity });

        // Calculate Purchases (Store In - Received items)
        const filterStoreIn = (item: StoreInRecord) => {
            let valid = true;

            // Date filtering
            if (startDate && item.timestamp) {
                const itemDate = new Date(item.timestamp);
                valid = valid && itemDate >= startDate;
            }
            if (endDate && item.timestamp) {
                const itemDate = new Date(item.timestamp);
                valid = valid && itemDate <= endDate;
            }

            if (filteredVendors.length > 0 && item.vendorName) {
                valid = valid && filteredVendors.includes(item.vendorName);
            }
            if (filteredProducts.length > 0 && item.productName) {
                valid = valid && filteredProducts.includes(item.productName);
            }
            if (filteredProjects.length > 0 && item.firmNameMatch) {
                valid = valid && filteredProjects.includes(item.firmNameMatch);
            }
            return valid;
        };

        // Assuming Purchases = Received items (Stage 6)
        const purchases = storeIns.filter(item => item.actual6 && filterStoreIn(item));
        const totalPurchasedQuantity = purchases.reduce(
            (sum, item) => sum + (item.receivedQuantity || 0),
            0
        );
        setPurchase({ count: purchases.length, quantity: totalPurchasedQuantity });

        // Calculate Out/Issued (from Issue Records)
        // Using Issue Service for "Issued" stats
        const filterIssue = (item: IssueRecord) => {
            let valid = true;

            // Date filtering
            if (startDate && item.actual1) {
                const itemDate = new Date(item.actual1);
                valid = valid && itemDate >= startDate;
            }
            if (endDate && item.actual1) {
                const itemDate = new Date(item.actual1);
                valid = valid && itemDate <= endDate;
            }

            // Issue record might not have vendor name in the same way, but has product name
            if (filteredProducts.length > 0 && item.product_name) {
                valid = valid && filteredProducts.includes(item.product_name);
            }
            if (filteredProjects.length > 0 && item.firm_name) {
                valid = valid && filteredProjects.includes(item.firm_name);
            }
            return valid;
        }

        const issued = issues.filter(item => item.actual1 && filterIssue(item)); // actual1 is issue date
        const totalIssuedQuantity = issued.reduce(
            (sum, item) => sum + (item.given_qty || 0),
            0
        );
        setOut({ count: issued.length, quantity: totalIssuedQuantity });

        // Trend Data Calculation (last 7 days or date range)
        const dateRange: string[] = [];
        const today = new Date();
        const start = startDate || new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate || today;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dateRange.push(format(new Date(d), 'yyyy-MM-dd'));
        }

        const trendMap: Record<string, TrendDataItem> = {};
        dateRange.forEach(d => {
            trendMap[d] = { date: format(new Date(d), 'MMM dd'), indents: 0, purchases: 0, issues: 0 };
        });

        indents.forEach(i => {
            if (i.timestamp) {
                const d = format(new Date(i.timestamp), 'yyyy-MM-dd');
                if (trendMap[d]) trendMap[d].indents += 1;
            }
        });

        // Calculate Top Vendors (grouped by unique PO for accurate order counts and valuation)
        const filteredPoData = poMasterData.filter(item => {
            if (filteredProjects.length > 0 && item.firmNameMatch) {
                return filteredProjects.includes(item.firmNameMatch);
            }
            return true;
        });

        // Group line items into unique Purchase Orders first to prevent multiplying totalPoAmount by line item count
        const poMap = new Map<string, {
            poNumber: string;
            partyName: string;
            totalPoAmount: number;
            items: any[];
        }>();

        filteredPoData.forEach((item) => {
            const poNo = item.poNumber || item.internalCode || 'N/A';
            const vendorName = String(item.partyName || '').trim();
            const key = `${vendorName}||${poNo}`;

            if (!poMap.has(key)) {
                poMap.set(key, {
                    poNumber: poNo,
                    partyName: vendorName,
                    totalPoAmount: Number(item.totalPoAmount) || 0,
                    items: [],
                });
            }
            poMap.get(key)!.items.push(item);
        });

        const uniquePoOrders = Array.from(poMap.values());
        const vendorMap: Record<string, { orders: number; quantity: number }> = {};

        uniquePoOrders.forEach((order) => {
            const vendorName = order.partyName;
            if (vendorName) {
                if (!vendorMap[vendorName]) {
                    vendorMap[vendorName] = { orders: 0, quantity: 0 };
                }
                const poValuation = order.totalPoAmount || order.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
                vendorMap[vendorName].orders += 1;
                vendorMap[vendorName].quantity += poValuation;
            }
        });

        // Update Total PO Value based on filter
        const currentPoTotal = uniquePoOrders.reduce((sum, order) => {
            const poValuation = order.totalPoAmount || order.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
            return sum + poValuation;
        }, 0);
        setPoTotal(currentPoTotal);

        const allVendorsSorted = Object.entries(vendorMap)
            .map(([name, data]) => ({
                name,
                orders: data.orders,
                quantity: data.quantity, // Total PO amount
            }))
            .sort((a, b) => b.quantity - a.quantity);

        setAllVendorsValuationData(allVendorsSorted);
        setTopVendors(allVendorsSorted.slice(0, 5));

        storeIns.forEach(s => {
            if (s.timestamp && filterStoreIn(s)) {
                const d = format(new Date(s.timestamp), 'yyyy-MM-dd');
                if (trendMap[d]) trendMap[d].purchases += 1;
            }
        });

        issues.forEach(iss => {
            if (iss.actual1 && filterIssue(iss)) {
                const d = format(new Date(iss.actual1), 'yyyy-MM-dd');
                if (trendMap[d]) trendMap[d].issues += 1;
            }
        });

        setTrendData(Object.values(trendMap));

        // Status Breakdown
        const statusMap: Record<string, number> = {
            'Pending Approval': indents.filter(i => !i.actual1 && filterByDateAndSelection(i)).length,
            'Vendor Assigned': indents.filter(i => i.actual1 && !i.actual2 && filterByDateAndSelection(i)).length,
            'PO Created': indents.filter(i => i.actual4 && filterByDateAndSelection(i)).length,
            'Material Received': storeIns.filter(s => s.actual6 && filterStoreIn(s)).length,
            'HOD Check': storeIns.filter(s => s.plannedHod && !s.actualHod && filterStoreIn(s)).length,
        };
        setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

    }, [startDate, endDate, filteredProducts, filteredVendors, filteredDepartments, filteredProjects, indents, storeIns, issues, isLoading, poMasterData]);

    const chartConfig = {
        quantity: {
            label: 'Quantity',
            color: 'var(--color-primary)',
        },
    } satisfies ChartConfig;

    return (
        <div>
            <Heading heading="Dashboard" subtext="View your analytics">
                <LayoutDashboard size={50} className="text-primary" />
            </Heading>

            <div className="grid gap-3 m-3">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 shadow-sm mb-1 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3 text-slate-500">
                        <Filter size={14} className="text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Analytics Filters</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Start Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        data-empty={!startDate}
                                        className="data-[empty=true]:text-muted-foreground w-full justify-between text-left font-medium border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors h-10 px-3"
                                    >
                                        <span className="truncate">{startDate ? format(startDate, 'PPP') : "Pick a start date"}</span>
                                        <CalendarIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">End Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        data-empty={!endDate}
                                        className="data-[empty=true]:text-muted-foreground w-full justify-between text-left font-medium border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors h-10 px-3"
                                    >
                                        <span className="truncate">{endDate ? format(endDate, 'PPP') : "Pick an end date"}</span>
                                        <CalendarIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Vendors</label>
                            <ComboBox
                                multiple
                                options={allVendors.map((v) => ({ label: v, value: v }))}
                                value={filteredVendors}
                                onChange={setFilteredVendors}
                                placeholder="All Vendors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Products</label>
                            <ComboBox
                                multiple
                                options={allProducts.map((v) => ({ label: v, value: v }))}
                                value={filteredProducts}
                                onChange={setFilteredProducts}
                                placeholder="All Products"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Projects</label>
                            <ComboBox
                                multiple
                                options={allProjects.map((v) => ({ label: v, value: v }))}
                                value={filteredProjects}
                                onChange={setFilteredProjects}
                                placeholder="All Projects"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-200">
                        <CardContent className="pt-6">
                            <div className="text-blue-600 flex justify-between items-center">
                                <p className="font-semibold text-sm">Procurement Indents</p>
                                <ClipboardList size={18} />
                            </div>
                            <p className="text-lg md:text-xl font-black text-blue-900 mt-2" title={indent.count.toLocaleString()}>{formatQty(indent.count)}</p>
                            <div className="text-blue-600 flex flex-col mt-2 border-t border-blue-200 pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Quantity</p>
                                <p className="text-base font-black" title={indent.quantity.toLocaleString()}>{formatQty(indent.quantity)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/20 border-indigo-200">
                        <CardContent className="pt-6">
                            <div className="text-indigo-600 flex justify-between items-center">
                                <p className="font-semibold text-sm">Total PO Value</p>
                                <CreditCard size={18} className="text-indigo-600" />
                            </div>
                            <p className="text-lg md:text-xl font-black text-indigo-900 mt-2 truncate" title={`₹${poTotal.toLocaleString()}`}>
                                {formatCurrency(poTotal)}
                            </p>
                            <div className="text-indigo-600 flex flex-col mt-2 border-t border-indigo-200 pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Avg/PO</p>
                                <p className="text-base font-black" title={`₹${(indent.count > 0 ? poTotal / indent.count : 0).toLocaleString()}`}>
                                    {formatCurrency(indent.count > 0 ? poTotal / indent.count : 0)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-200">
                        <CardContent className="pt-6">
                            <div className="text-green-600 flex justify-between items-center">
                                <p className="font-semibold text-sm">Items Received</p>
                                <Truck size={18} />
                            </div>
                            <p className="text-lg md:text-xl font-black text-green-900 mt-2" title={purchase.count.toLocaleString()}>{formatQty(purchase.count)}</p>
                            <div className="text-green-600 flex flex-col mt-2 border-t border-green-200 pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Qty</p>
                                <p className="text-base font-black" title={purchase.quantity.toLocaleString()}>{formatQty(purchase.quantity)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-200">
                        <CardContent className="pt-6">
                            <div className="text-orange-600 flex justify-between items-center">
                                <p className="font-semibold text-sm">Stock Issued</p>
                                <PackageCheck size={18} />
                            </div>
                            <p className="text-lg md:text-xl font-black text-orange-900 mt-2" title={out.count.toLocaleString()}>{formatQty(out.count)}</p>
                            <div className="text-orange-600 flex flex-col mt-2 border-t border-orange-200 pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Issue Qty</p>
                                <p className="text-base font-black" title={out.quantity.toLocaleString()}>{formatQty(out.quantity)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-red-500/10 to-red-600/20 border-red-200 text-red-600 md:col-span-4 lg:col-span-1">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-sm">Stock Alerts</p>
                                <Warehouse size={18} />
                            </div>
                            <p className="text-lg md:text-xl font-black text-red-900 mt-2">
                                {alerts.outOfStock}
                            </p>
                            <div className="text-red-600 flex flex-col mt-2 border-t border-red-200 pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Low Stock</p>
                                <p className="text-base font-black">{alerts.lowStock}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-xl">Procurement & Outflow Trends</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorIndents" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={10} />
                                    <YAxis axisLine={false} tickLine={false} tickMargin={10} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="indents" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIndents)" strokeWidth={3} name="Indents" />
                                    <Area type="monotone" dataKey="purchases" stroke="#10b981" fillOpacity={1} fill="url(#colorPurchases)" strokeWidth={3} name="Purchases" />
                                    <Area type="monotone" dataKey="issues" stroke="#f97316" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" name="Stock Issued" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Departmental Indenting</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] flex flex-col justify-center items-center">
                            <ResponsiveContainer width="100%" height="80%">
                                <PieChart>
                                    <Pie
                                        data={deptData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {deptData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#f97316'][index % 6]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full text-xs mt-2 overflow-y-auto max-h-20">
                                {deptData.map((d, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#f97316'][i % 6] }}></div>
                                        <span className="truncate">{d.name} ({d.value})</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card> */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-xl">Workflow Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusData} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                        <LabelList dataKey="value" position="right" style={{ fontSize: '10px' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xl">Top Vendors by Volume</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                onClick={() => setIsVendorModalOpen(true)}
                            >
                                <Building2 size={13} />
                                View All Vendors ({allVendorsValuationData.length})
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topVendorsData.length > 0 ? (
                                    topVendorsData.map((vendor, i) => (
                                        <div key={i} className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs mr-3">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-700 leading-none truncate max-w-[150px]" title={vendor.name}>{vendor.name}</p>
                                                <p className="text-xs text-slate-500 mt-1">{vendor.orders} Orders processed</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900" title={`₹${vendor.quantity.toLocaleString()}`}>
                                                    {formatCurrency(vendor.quantity)}
                                                </p>
                                                <p className="text-[10px] text-slate-400 uppercase font-medium">Value</p>
                                            </div>
                                            <div className="ml-4 w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${(vendor.quantity / topVendorsData[0].quantity) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-10 italic">
                                        No vendor performance data available
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* PC Reports Section */}
                <div className="grid grid-cols-1 gap-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">PC Report Stage Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                {pcReportSheet.map((pc, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 truncate" title={pc.stage}>
                                            {pc.stage}
                                        </p>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xl font-black text-slate-800">{pc.totalPending}</p>
                                                <p className="text-[9px] text-red-500 font-medium">Pending</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600">{pc.totalComplete}</p>
                                                <p className="text-[9px] text-green-500 font-medium">Done</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Master Insertion Section */}
                <div className="grid grid-cols-1 gap-3">
                    <Card className="border-slate-200 bg-slate-50/50">
                        <CardHeader className="flex flex-row items-center gap-2">
                            <Database className="h-5 w-5 text-slate-600" />
                            <CardTitle className="text-xl">Master Data Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Field</label>
                                    <Select value={masterColumn} onValueChange={setMasterColumn}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select master field to add to" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vendor_name">Vendor Name</SelectItem>
                                            <SelectItem value="vendor_gstin">Vendor GSTIN</SelectItem>
                                            <SelectItem value="vendor_address">Vendor Address</SelectItem>
                                            <SelectItem value="vendor_email">Vendor Email</SelectItem>
                                            <SelectItem value="payment_term">Payment Term</SelectItem>
                                            {/* <SelectItem value="department">Department</SelectItem> */}
                                            <SelectItem value="group_head">Group Head</SelectItem>
                                            <SelectItem value="item_name">Item Name</SelectItem>
                                            <SelectItem value="company_name">Company Name</SelectItem>
                                            <SelectItem value="company_address">Company Address</SelectItem>
                                            <SelectItem value="company_email">Company Email</SelectItem>
                                            <SelectItem value="company_gstin">Company GSTIN</SelectItem>
                                            <SelectItem value="company_phone">Company Phone</SelectItem>
                                            <SelectItem value="billing_address">Billing Address</SelectItem>
                                            <SelectItem value="company_pan">Company PAN</SelectItem>
                                            <SelectItem value="destination_address">Destination Address</SelectItem>
                                            <SelectItem value="default_terms">Default Terms</SelectItem>
                                            <SelectItem value="person_name">Person Name</SelectItem>
                                            <SelectItem value="firm_name">Firm Name (Project)</SelectItem>
                                            <SelectItem value="uom">UOM</SelectItem>
                                            <SelectItem value="where">Location (Where)</SelectItem>
                                            <SelectItem value="fms_name">FMS Name</SelectItem>
                                            <SelectItem value="indenter_name">Indenter Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-[2] space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enter Value</label>
                                    <Input
                                        placeholder="Type the value to insert..."
                                        value={masterValue}
                                        onChange={(e) => setMasterValue(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <Button
                                    className="bg-slate-800 hover:bg-slate-900 text-white gap-2 px-6"
                                    onClick={async () => {
                                        if (!masterColumn || !masterValue) {
                                            toast.error('Please select a field and enter a value');
                                            return;
                                        }
                                        setIsInserting(true);
                                        const result = await insertMasterData({ [masterColumn]: masterValue });
                                        setIsInserting(false);
                                        if (result.success) {
                                            toast.success('Data added to master table successfully');
                                            setMasterValue('');
                                            // Optional: Refresh master data in context if needed
                                        } else {
                                            toast.error('Failed to add data to master table');
                                        }
                                    }}
                                    disabled={isInserting}
                                >
                                    {isInserting ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    Insert Data
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* All Vendors Valuation & Volume Modal */}
            <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
                <DialogContent className="w-[95vw] md:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                    <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                                    <Building2 size={20} className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                                        Vendor Valuation & Volume Breakdown
                                    </DialogTitle>
                                    <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                                        Total valuation and purchase order activity across all vendors
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>

                        {/* Top KPI Cards inside Modal */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-5">
                            <div className="bg-card border rounded-lg p-2.5 sm:p-3 shadow-2xs">
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">Total Vendors</p>
                                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5 sm:mt-1">{allVendorsValuationData.length}</p>
                            </div>
                            <div className="bg-card border rounded-lg p-2.5 sm:p-3 shadow-2xs">
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">Total Valuation</p>
                                <p className="text-base sm:text-xl font-bold text-blue-600 mt-0.5 sm:mt-1">{formatCurrency(modalTotalValuation)}</p>
                            </div>
                            <div className="bg-card border rounded-lg p-2.5 sm:p-3 shadow-2xs">
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">Total Orders</p>
                                <p className="text-base sm:text-xl font-bold text-emerald-600 mt-0.5 sm:mt-1">{modalTotalOrders.toLocaleString()}</p>
                            </div>
                            <div className="bg-card border rounded-lg p-2.5 sm:p-3 shadow-2xs">
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">Avg Order Value</p>
                                <p className="text-base sm:text-xl font-bold text-purple-600 mt-0.5 sm:mt-1">
                                    {modalTotalOrders > 0 ? formatCurrency(modalTotalValuation / modalTotalOrders) : '₹0'}
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Filter & Search Bar */}
                    <div className="p-3 sm:p-4 bg-card border-b flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-between items-center">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search vendor by name..."
                                value={vendorSearchQuery}
                                onChange={(e) => setVendorSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs sm:text-sm"
                            />
                            {vendorSearchQuery && (
                                <button
                                    onClick={() => setVendorSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Sort by:</span>
                            <Select value={vendorSortBy} onValueChange={(v: any) => setVendorSortBy(v)}>
                                <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                                    <SelectValue placeholder="Sort order" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="value-desc">Highest Valuation</SelectItem>
                                    <SelectItem value="value-asc">Lowest Valuation</SelectItem>
                                    <SelectItem value="orders-desc">Most Orders Processed</SelectItem>
                                    <SelectItem value="name-asc">Vendor Name (A-Z)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Vendors Table / List */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-h-[50vh]">
                        {processedModalVendors.length > 0 ? (
                            <div className="space-y-2">
                                <div className="hidden sm:grid grid-cols-12 text-xs font-semibold text-muted-foreground px-3 py-1 border-b">
                                    <div className="col-span-1">Rank</div>
                                    <div className="col-span-4">Vendor Name</div>
                                    <div className="col-span-2 text-center">Orders</div>
                                    <div className="col-span-2 text-right">Valuation</div>
                                    <div className="col-span-3 text-right">Volume Share</div>
                                </div>

                                {processedModalVendors.map((vendor) => {
                                    const maxVal = allVendorsValuationData[0]?.quantity || 1;
                                    const percentOfMax = (vendor.quantity / maxVal) * 100;
                                    const percentOfTotal = modalTotalValuation > 0 ? ((vendor.quantity / modalTotalValuation) * 100).toFixed(1) : '0';
                                    
                                    const origRank = allVendorsValuationData.findIndex((v) => v.name === vendor.name) + 1;

                                    return (
                                        <div
                                            key={vendor.name}
                                            onClick={() => {
                                                setSelectedVendorForDetails(vendor.name);
                                                setOrderSearchQuery('');
                                                setIsVendorDetailsModalOpen(true);
                                            }}
                                            className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-2 p-3 rounded-lg border bg-card hover:bg-blue-50/60 dark:hover:bg-blue-950/20 hover:border-blue-300 transition-all cursor-pointer group"
                                            title="Click to view detailed order summary for this vendor"
                                        >
                                            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto sm:col-span-1">
                                                <span
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        origRank === 1
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                            : origRank === 2
                                                            ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                                            : origRank === 3
                                                            ? 'bg-amber-700/10 text-amber-900 border border-amber-700/20'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {origRank}
                                                </span>
                                                <ChevronRight size={16} className="text-muted-foreground sm:hidden group-hover:text-blue-600 transition-all" />
                                            </div>

                                            <div className="sm:col-span-4 w-full">
                                                <p className="text-sm font-semibold text-foreground truncate group-hover:text-blue-600 transition-colors" title={vendor.name}>
                                                    {vendor.name}
                                                </p>
                                                <div className="flex items-center justify-between mt-1 sm:hidden text-[11px] text-muted-foreground">
                                                    <span className="font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
                                                        {vendor.orders} Orders
                                                    </span>
                                                    <span className="font-bold text-foreground">
                                                        {formatCurrency(vendor.quantity)} ({percentOfTotal}%)
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="hidden sm:block sm:col-span-2 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {vendor.orders} Orders
                                                </span>
                                            </div>

                                            <div className="hidden sm:block sm:col-span-2 text-right">
                                                <p className="text-sm font-bold text-foreground" title={`₹${vendor.quantity.toLocaleString('en-IN')}`}>
                                                    {formatCurrency(vendor.quantity)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">₹{vendor.quantity.toLocaleString('en-IN')}</p>
                                            </div>

                                            <div className="hidden sm:flex sm:col-span-3 items-center justify-end gap-2">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs font-semibold text-blue-600">{percentOfTotal}%</span>
                                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${Math.max(percentOfMax, 2)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} className="text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-muted-foreground space-y-2">
                                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                <p className="text-sm font-medium">No vendors found matching your criteria</p>
                                {vendorSearchQuery && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setVendorSearchQuery('')}
                                        className="mt-2 text-xs"
                                    >
                                        Clear Search
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Vendor Orders Detailed Summary Modal */}
            <Dialog open={isVendorDetailsModalOpen} onOpenChange={setIsVendorDetailsModalOpen}>
                <DialogContent className="w-[95vw] md:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                    <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b bg-muted/20">
                        <div className="flex items-center justify-between pr-6 sm:pr-0">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                                    <Building2 size={20} className="sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-base sm:text-xl font-bold text-foreground leading-tight truncate" title={selectedVendorForDetails || ''}>
                                        {selectedVendorForDetails || 'Vendor Orders Summary'}
                                    </DialogTitle>
                                    <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                                        Detailed purchase order summary, line items, and fulfillment history
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>

                        {/* Top KPI Cards inside Detail Modal */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-5">
                            <div className="bg-card border rounded-lg p-2.5 sm:p-3 shadow-2xs">
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">Total PO Orders</p>
                                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5 sm:mt-1">{selectedVendorGroupedOrders.length}</p>
                            </div>
                            <div className="bg-card border rounded-lg p-2.5 sm:p-3 shadow-2xs">
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">Total Line Items</p>
                                <p className="text-base sm:text-xl font-bold text-blue-600 mt-0.5 sm:mt-1">{selectedVendorItems.length}</p>
                            </div>
                            <div className="bg-card border rounded-lg p-2.5 sm:p-3 shadow-2xs">
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">Total Valuation</p>
                                <p className="text-base sm:text-xl font-bold text-emerald-600 mt-0.5 sm:mt-1">
                                    {formatCurrency(selectedVendorTotalValuation)}
                                </p>
                            </div>
                            <div className="bg-card border rounded-lg p-2.5 sm:p-3 shadow-2xs">
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">Avg Order Value</p>
                                <p className="text-base sm:text-xl font-bold text-purple-600 mt-0.5 sm:mt-1">
                                    {selectedVendorGroupedOrders.length > 0
                                        ? formatCurrency(selectedVendorTotalValuation / selectedVendorGroupedOrders.length)
                                        : '₹0'}
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Filter & Search Bar */}
                    <div className="p-3 sm:p-4 bg-card border-b flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-between items-center">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by PO number, item, or project..."
                                value={orderSearchQuery}
                                onChange={(e) => setOrderSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs sm:text-sm"
                            />
                            {orderSearchQuery && (
                                <button
                                    onClick={() => setOrderSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="text-xs text-muted-foreground w-full sm:w-auto text-right">
                            Showing <span className="font-semibold text-foreground">{filteredVendorOrders.length}</span> of {selectedVendorGroupedOrders.length} orders
                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[55vh]">
                        {filteredVendorOrders.length > 0 ? (
                            filteredVendorOrders.map((order) => {
                                const poValuation = order.totalPoAmount || order.items.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
                                return (
                                    <div key={order.poNumber} className="border rounded-xl p-3 sm:p-4 bg-card shadow-2xs hover:shadow-xs transition-all space-y-3">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 sm:pb-3 border-b">
                                            <div className="flex items-center gap-2">
                                                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-xs shrink-0">
                                                    PO
                                                </span>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm sm:text-base font-bold text-foreground flex flex-wrap items-center gap-1.5">
                                                        <span>{order.poNumber}</span>
                                                        {order.firmName && (
                                                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[150px]">
                                                                {order.firmName}
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                                                        Date: {order.timestamp ? formatDate(order.timestamp) : 'N/A'}
                                                        {order.deliveryDate ? ` • Delivery: ${formatDate(order.deliveryDate)}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                                                <div className="text-left sm:text-right">
                                                    <p className="text-sm sm:text-base font-bold text-foreground">
                                                        {formatCurrency(poValuation)}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">₹{poValuation.toLocaleString('en-IN')}</p>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 shrink-0"
                                                    onClick={() => openPoPdfPreview(order.poNumber, poMasterData, {
                                                        firmId: order.firmId,
                                                        firmName: order.firmName || undefined,
                                                        date: order.timestamp || undefined,
                                                        indentNumber: order.indentNumber || order.items[0]?.internalCode || undefined,
                                                    })}
                                                >
                                                    <Eye size={13} />
                                                    Preview PDF
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Mobile Item Cards (< sm) */}
                                        <div className="sm:hidden space-y-2 pt-1">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="p-2.5 rounded-lg bg-muted/30 border text-xs space-y-1.5">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="font-semibold text-foreground leading-snug">{item.product}</span>
                                                        <span className="font-bold text-foreground text-right shrink-0">
                                                            ₹{Number(item.amount || (item.quantity * item.rate) || 0).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                                                        {item.internalCode && <span>Indent: <strong className="text-foreground">{item.internalCode}</strong></span>}
                                                        <span>Qty: <strong className="text-foreground">{item.quantity} {item.unit || ''}</strong></span>
                                                        <span>Rate: <strong className="text-foreground">₹{Number(item.rate || 0).toLocaleString('en-IN')}</strong></span>
                                                        <span>GST: <strong className="text-foreground">{item.gst || item.gstPercent || 0}%</strong></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Desktop / Tablet Items Table (>= sm) */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="w-full text-xs min-w-[550px]">
                                                <thead>
                                                    <tr className="text-muted-foreground border-b text-left">
                                                        <th className="pb-1.5 font-medium">Product / Item</th>
                                                        <th className="pb-1.5 font-medium">Indent No.</th>
                                                        <th className="pb-1.5 font-medium text-right">Qty & Unit</th>
                                                        <th className="pb-1.5 font-medium text-right">Rate</th>
                                                        <th className="pb-1.5 font-medium text-right">GST %</th>
                                                        <th className="pb-1.5 font-medium text-right">Line Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {order.items.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-muted/30">
                                                            <td className="py-2 font-medium text-foreground max-w-[220px] truncate" title={item.product}>
                                                                {item.product}
                                                            </td>
                                                            <td className="py-2 text-muted-foreground">{item.internalCode || '--'}</td>
                                                            <td className="py-2 text-right font-medium">
                                                                {item.quantity} {item.unit || ''}
                                                            </td>
                                                            <td className="py-2 text-right text-muted-foreground">
                                                                ₹{Number(item.rate || 0).toLocaleString('en-IN')}
                                                            </td>
                                                            <td className="py-2 text-right text-muted-foreground">
                                                                {item.gst || item.gstPercent || 0}%
                                                            </td>
                                                            <td className="py-2 text-right font-semibold text-foreground">
                                                                ₹{Number(item.amount || (item.quantity * item.rate) || 0).toLocaleString('en-IN')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center text-muted-foreground space-y-2">
                                <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                <p className="text-sm font-medium">No purchase orders found for this vendor</p>
                                {orderSearchQuery && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOrderSearchQuery('')}
                                        className="mt-2 text-xs"
                                    >
                                        Clear Search
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Interfaces needed to keep the file valid
interface VendorDataItem {
    name: string;
    orders: number;
    quantity: number;
}

interface StatsData {
    count: number;
    quantity: number;
}

interface AlertsData {
    lowStock: number;
    outOfStock: number;
}

interface TrendDataItem {
    date: string;
    indents: number;
    purchases: number;
    issues: number;
}

interface DeptDataItem {
    name: string;
    value: number;
}

interface StatusDataItem {
    name: string;
    value: number;
}
