'use client';

import {
 AlertCircle,
 BarChart3,
 Building2,
 ChevronLeft,
 ChevronRight as ChevronRightIcon,
 FileText,
 IndianRupee,
 Loader2,
 Package,
 PieChart as PieIcon,
 Search,
 Settings2,
 ShieldCheck,
 X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useAMCData } from '../server/tanstackQuery/useAmcQueries';
import type { AMCMachineItem, AMCVendorItem } from '../types/types';

const COLORS = [
 '#0ea5e9',
 '#f59e0b',
 '#10b981',
 '#ef4444',
 '#8b5cf6',
 '#ec4899',
 '#06b6d4',
 '#f97316',
 '#14b8a6',
 '#6366f1',
];

const formatCurrency = (amount: number) =>
 new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);

const formatDate = (date: string | null) =>
 date ? new Date(date).toLocaleDateString('en-IN') : '—';

const getStatusStyle = (status: string) => {
 switch (status?.toLowerCase()) {
 case 'inspected':
 case 'completed':
 return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
 case 'pending':
 return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
 case 'assigned':
 case 'in progress':
 return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
 default:
 return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
 }
};

export default function MainRepairBotivateAMC() {
 const [activeTab, setActiveTab] = useState<'vendor' | 'machine'>('machine');
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [currentPage, setCurrentPage] = useState(1);
 const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
 const [selectedVendor, setSelectedVendor] = useState<AMCVendorItem | null>(null);
 const itemsPerPage = 20;

  const { effectivePermittedFirms } = useProject();
  const { data, isLoading, isError, error } = useAMCData();

  const rawMachineData = data?.machineData ?? [];
  const allMachineData = useMemo<AMCMachineItem[]>(() => {
    return filterByFirmAccess(rawMachineData, effectivePermittedFirms);
  }, [rawMachineData, effectivePermittedFirms]);
  const vendorData = data?.vendorData ?? [];
  const allTimeTotalCost = data?.allTimeTotalCost ?? 0;

 useEffect(() => {
 setCurrentPage(1);
 }, []);

 // Year-filtered machine data (client-side)
 const yearFilteredData = useMemo(
 () =>
 allMachineData.filter((item) => {
 if (!item.createdAt) return false;
 const d = new Date(item.createdAt);
 return !isNaN(d.getTime()) && d.getFullYear() === selectedYear;
 }),
 [allMachineData, selectedYear]
 );

 // Status + search filtered for the table
 const filteredMachineData = useMemo(() => {
 return yearFilteredData.filter((item) => {
 const matchesSearch = (item.machineName?.toLowerCase() || '').includes(
 searchTerm.toLowerCase()
 );
 const matchesStatus =
 statusFilter === 'all' || item.taskStatus?.toLowerCase() === statusFilter.toLowerCase();
 return matchesSearch && matchesStatus;
 });
 }, [yearFilteredData, searchTerm, statusFilter]);

 const totalPages = Math.ceil(filteredMachineData.length / itemsPerPage);
 const startIndex = (currentPage - 1) * itemsPerPage;
 const endIndex = startIndex + itemsPerPage;
 const currentPageData = filteredMachineData.slice(startIndex, endIndex);

 // Only true when the backend merged this list across companies — absent
 // for every individual company and every single-company session, so this
 // table stays byte-identical to before for them.
 const hasTenantColumn = filteredMachineData.some((item: any) => item.tenant);

 const annualCost = useMemo(
 () => yearFilteredData.reduce((sum, item) => sum + (item.cost || 0), 0),
 [yearFilteredData]
 );

 const fullMachineCosts = useMemo(() => {
 const map: Record<string, number> = {};
 yearFilteredData.forEach((item) => {
 const name = item.machineName?.trim() || 'Unknown';
 map[name] = (map[name] || 0) + (item.cost || 0);
 });
 return Object.entries(map)
 .map(([name, value]) => ({ name, value }))
 .sort((a, b) => b.value - a.value);
 }, [yearFilteredData]);

 const machinePieData = useMemo(() => {
 if (fullMachineCosts.length <= 6) return fullMachineCosts;
 const top5 = fullMachineCosts.slice(0, 5);
 const othersValue = fullMachineCosts.slice(5).reduce((s, i) => s + i.value, 0);
 return [...top5, { name: 'Others', value: othersValue }];
 }, [fullMachineCosts]);

 const vendorPieData = useMemo(() => {
 const base = vendorData.map((v) => ({ name: v.vendorName, value: v.totalAmount ?? 0 }));
 if (base.length <= 6) return base;
 const top5 = base.slice(0, 5);
 const othersValue = base.slice(5).reduce((s, i) => s + i.value, 0);
 return [...top5, { name: 'Others', value: othersValue }];
 }, [vendorData]);

 const totalVendorCost = useMemo(
 () => vendorData.reduce((sum, v) => sum + (v.totalAmount ?? 0), 0),
 [vendorData]
 );

 return (
 <div className="p-4 pt-0 space-y-4 animate-in fade-in duration-500">
 {/* Tabs */}
 <div className="flex p-0.5 bg-neutral-100 dark:bg-neutral-900 rounded-lg max-w-sm mx-auto">
 <button
 type="button"
 onClick={() => {
 setActiveTab('vendor');
 setStatusFilter('all');
 setSearchTerm('');
 }}
 className={`flex-1 py-4.5 px-4 text-xs font-bold rounded-md transition-all ${
 activeTab === 'vendor'
 ? 'bg-green-600 text-white shadow-sm'
 : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
 }`}
 >
 <span className="flex items-center justify-center gap-2">
 <Building2 className="w-3.5 h-3.5" />
 Vendor AMC
 </span>
 </button>
 <button
 type="button"
 onClick={() => {
 setActiveTab('machine');
 setStatusFilter('all');
 setSearchTerm('');
 }}
 className={`flex-1 py-1.5 px-4 text-xs font-bold rounded-md transition-all ${
 activeTab === 'machine'
 ? 'bg-green-600 text-white shadow-sm'
 : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
 }`}
 >
 <span className="flex items-center justify-center gap-2">
 <Settings2 className="w-3.5 h-3.5" />
 Machine AMC
 </span>
 </button>
 </div>

 {activeTab === 'machine' ? (
 <>
 {/* Header */}
 <div className="grid grid-cols-1 lg:grid-cols-4 items-start mt-6">
 <div className="lg:col-span-1">
 <h1 className="text-2xl font-bold text-foreground tracking-tight">Machine Repairs</h1>
 <p className="text-muted-foreground flex items-center gap-2 text-xs mt-1">
 <ShieldCheck className="w-4 h-4 text-green-500" />
 Track repair tasks and costs
 </p>
 </div>

 <div className="lg:col-span-3">
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="flex-1 min-w-0 bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm">
 <div className="flex items-center justify-between mb-1">
 <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
 <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
 </div>
 <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded uppercase truncate">
 All-Time Total
 </span>
 </div>
 <p className="text-base font-bold truncate">{formatCurrency(allTimeTotalCost)}</p>
 </div>

 <div className="flex-1 min-w-0 bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm border-l-2 border-l-purple-500">
 <div className="flex items-center justify-between mb-1">
 <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-md">
 <IndianRupee className="w-4 h-4 text-purple-600 dark:text-purple-400" />
 </div>
 <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/40 px-2 py-0.5 rounded uppercase truncate">
 Annual Cost ({selectedYear})
 </span>
 </div>
 <p className="text-base font-bold truncate">{formatCurrency(annualCost)}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Charts */}
 {!isLoading && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
 <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm h-[340px] flex flex-col">
 <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground uppercase tracking-wider">
 <Building2 className="w-4 h-4 text-blue-500" />
 Costs per Machine
 </h3>
 <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 bg-white dark:bg-neutral-800 z-10">
 <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-neutral-100 dark:border-neutral-700">
 <th className="pb-2">Machine</th>
 <th className="pb-2 text-right">Cost</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
 {fullMachineCosts.length > 0 ? (
 fullMachineCosts.map((item, index) => (
 <tr
 key={item.name}
 className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
 >
 <td className="py-2">
 <div className="flex items-center gap-2">
 <div
 className="w-2 h-2 rounded-full"
 style={{ backgroundColor: COLORS[index % COLORS.length] }}
 />
 <span className="text-xs font-medium text-foreground truncate max-w-[180px]">
 {item.name}
 </span>
 </div>
 </td>
 <td className="py-2 text-right">
 <span className="text-xs font-bold text-foreground">
 {formatCurrency(item.value)}
 </span>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td
 colSpan={2}
 className="py-8 text-center text-muted-foreground text-xs"
 >
 No data for {selectedYear}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm h-[340px]">
 <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground uppercase tracking-wider">
 <PieIcon className="w-4 h-4 text-orange-500" />
 Machine Distribution
 </h3>
 <div className="h-[260px] w-full">
 {machinePieData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={machinePieData}
 cx="50%"
 cy="50%"
 innerRadius={55}
 outerRadius={85}
 paddingAngle={4}
 dataKey="value"
 >
 {machinePieData.map((_entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip
 formatter={(value: unknown) => formatCurrency((value as number) || 0)}
 contentStyle={{
 backgroundColor: 'rgba(255, 255, 255, 0.95)',
 borderRadius: '6px',
 border: 'none',
 fontSize: '11px',
 boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)',
 }}
 />
 <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
 <BarChart3 className="w-10 h-10 mb-2 opacity-10" />
 <p className="text-xs">No cost data</p>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Table */}
 <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm overflow-hidden mt-6">
 <div className="p-2 border-b border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row justify-between gap-3">
 <div className="flex items-center gap-2 overflow-x-auto pl-1">
 <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-md mr-4">
 {[2024, 2025, 2026].map((year) => (
 <button
 type="button"
 key={year}
 onClick={() => setSelectedYear(year)}
 className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
 selectedYear === year
 ? 'bg-white dark:bg-neutral-700 shadow-sm text-foreground'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 {year}
 </button>
 ))}
 </div>

 <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 mx-2" />

 <button
 type="button"
 onClick={() => setStatusFilter('all')}
 className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap ${
 statusFilter === 'all'
 ? 'bg-orange-600 text-white'
 : 'bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600'
 }`}
 >
 All
 </button>
 <button
 type="button"
 onClick={() => setStatusFilter('pending')}
 className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap ${
 statusFilter === 'pending'
 ? 'bg-rose-600 text-white'
 : 'bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600'
 }`}
 >
 Pending
 </button>
 <button
 type="button"
 onClick={() => setStatusFilter('completed')}
 className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap ${
 statusFilter === 'completed'
 ? 'bg-green-600 text-white'
 : 'bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600'
 }`}
 >
 Completed
 </button>
 </div>

 <div className="relative w-full sm:w-72">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <input
 type="text"
 placeholder="Search machines..."
 className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>

 {/* Desktop Table */}
 <div className="hidden lg:block max-h-[450px] overflow-y-auto relative">
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 bg-white dark:bg-neutral-800 z-10 shadow-sm">
 <tr className="bg-neutral-50/50 dark:bg-neutral-900/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-700">
 {hasTenantColumn && <th className="px-4 py-3">Company</th>}
 <th className="px-4 py-3">Machine Name</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3">Source</th>
 <th className="px-4 py-3 text-right">Bill Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
 {isLoading ? (
 <tr>
 <td colSpan={hasTenantColumn ? 5 : 4} className="px-6 py-20 text-center">
 <div className="flex justify-center items-center gap-2 text-muted-foreground">
 <Loader2 className="w-4 h-4 animate-spin" />
 <span>Loading repair data...</span>
 </div>
 </td>
 </tr>
 ) : isError ? (
 <tr>
 <td colSpan={hasTenantColumn ? 5 : 4} className="px-6 py-20 text-center">
 <div className="flex flex-col items-center text-rose-600 dark:text-rose-400">
 <AlertCircle className="w-12 h-12 mb-4" />
 <p className="text-lg font-medium">Error loading data</p>
 <p className="text-sm">{(error as Error)?.message}</p>
 </div>
 </td>
 </tr>
 ) : currentPageData.length > 0 ? (
 currentPageData.map((item) => (
 <tr
 key={item.id}
 className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
 >
 {hasTenantColumn && (
 <td className="px-4 py-2.5">
 {item.tenant ? (
 <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold">
 {item.tenant.name}
 </span>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 </td>
 )}
 <td className="px-4 py-2.5">
 <div className="flex items-center gap-2">
 <div>
 <p className="text-sm font-medium text-foreground">
 {item.machineName || '—'}
 </p>
 {item.machineSerialNo && (
 <p className="text-xs text-muted-foreground">
 {item.machineSerialNo}
 </p>
 )}
 </div>
 </div>
 </td>
 <td className="px-4 py-2.5">
 <span
 className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase border ${getStatusStyle(item.taskStatus || '')}`}
 >
 {item.taskStatus || 'pending'}
 </span>
 </td>
 <td className="px-4 py-2.5">
 <span
 className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
 item.source === 'workorder'
 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
 : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800'
 }`}
 >
 {item.source === 'workorder' ? 'Work Order' : 'Indent'}
 </span>
 </td>
 <td className="px-4 py-2.5 text-right">
 {item.cost > 0 ? (
 <span className="text-sm font-bold text-foreground">
 {formatCurrency(item.cost)}
 </span>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={hasTenantColumn ? 5 : 4} className="px-6 py-20 text-center">
 <div className="flex flex-col items-center justify-center text-muted-foreground">
 <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
 <p className="text-lg font-medium">No repair records found</p>
 <p className="text-sm">Try adjusting your filters</p>
 </div>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Mobile Cards */}
 <div className="lg:hidden max-h-[450px] overflow-y-auto space-y-3 p-4">
 {isLoading ? (
 <div className="flex justify-center items-center gap-2 text-muted-foreground py-16">
 <Loader2 className="w-4 h-4 animate-spin" />
 <span>Loading repair data...</span>
 </div>
 ) : isError ? (
 <div className="flex flex-col items-center text-rose-600 dark:text-rose-400 py-16 text-center">
 <AlertCircle className="w-12 h-12 mb-4" />
 <p className="text-lg font-medium">Error loading data</p>
 <p className="text-sm">{(error as Error)?.message}</p>
 </div>
 ) : currentPageData.length > 0 ? (
 currentPageData.map((item) => (
 <div
 key={item.id}
 className="bg-neutral-50 dark:bg-neutral-900/40 rounded-lg p-3 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2"
 >
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
 <p className="text-sm font-medium text-foreground truncate">
 {item.machineName || '—'}
 </p>
 {item.machineSerialNo && (
 <p className="text-xs text-muted-foreground truncate">
 {item.machineSerialNo}
 </p>
 )}
 </div>
 {item.cost > 0 ? (
 <span className="text-sm font-bold text-foreground whitespace-nowrap">
 {formatCurrency(item.cost)}
 </span>
 ) : (
 <span className="text-xs text-muted-foreground whitespace-nowrap">—</span>
 )}
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <span
 className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase border ${getStatusStyle(item.taskStatus || '')}`}
 >
 {item.taskStatus || 'pending'}
 </span>
 <span
 className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
 item.source === 'workorder'
 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
 : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800'
 }`}
 >
 {item.source === 'workorder' ? 'Work Order' : 'Indent'}
 </span>
 </div>
 </div>
 ))
 ) : (
 <div className="flex flex-col items-center justify-center text-muted-foreground py-16 text-center">
 <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
 <p className="text-lg font-medium">No repair records found</p>
 <p className="text-sm">Try adjusting your filters</p>
 </div>
 )}
 </div>

 {filteredMachineData.length > 0 && (
 <div className="p-2.5 bg-neutral-50/50 dark:bg-neutral-900/10 border-t border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3">
 <div className="text-xs text-muted-foreground">
 Showing {startIndex + 1} to {Math.min(endIndex, filteredMachineData.length)} of{' '}
 {filteredMachineData.length} records
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
 disabled={currentPage === 1}
 className={`p-1.5 rounded-lg transition-colors ${
 currentPage === 1
 ? 'text-muted-foreground/50 cursor-not-allowed'
 : 'text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700'
 }`}
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 <div className="flex items-center gap-1">
 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
 let pageNum: number;
 if (totalPages <= 5) pageNum = i + 1;
 else if (currentPage <= 3) pageNum = i + 1;
 else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
 else pageNum = currentPage - 2 + i;
 return (
 <button
 type="button"
 key={pageNum}
 onClick={() => setCurrentPage(pageNum)}
 className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
 currentPage === pageNum
 ? 'bg-orange-600 text-white'
 : 'text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700'
 }`}
 >
 {pageNum}
 </button>
 );
 })}
 {totalPages > 5 && currentPage < totalPages - 2 && (
 <>
 <span className="text-muted-foreground">...</span>
 <button
 type="button"
 onClick={() => setCurrentPage(totalPages)}
 className="w-7 h-7 rounded-lg text-xs font-medium text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700"
 >
 {totalPages}
 </button>
 </>
 )}
 </div>
 <button
 type="button"
 onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
 disabled={currentPage === totalPages}
 className={`p-1.5 rounded-lg transition-colors ${
 currentPage === totalPages
 ? 'text-muted-foreground/50 cursor-not-allowed'
 : 'text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700'
 }`}
 >
 <ChevronRightIcon className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}
 </div>
 </>
 ) : (
 /* Vendor AMC */
 <>
 <div className="grid grid-cols-1 lg:grid-cols-4 items-start mt-6">
 <div className="lg:col-span-1">
 <h1 className="text-2xl font-bold text-foreground tracking-tight">Vendor Analysis</h1>
 <p className="text-muted-foreground flex items-center gap-2 text-xs mt-1">
 <Building2 className="w-4 h-4 text-green-500" />
 Aggregated expenditure per vendor
 </p>
 </div>

 <div className="lg:col-span-3">
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="flex-1 min-w-0 bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm border-l-2 border-l-green-500">
 <div className="flex items-center justify-between mb-1">
 <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-md">
 <IndianRupee className="w-4 h-4 text-green-600 dark:text-green-400" />
 </div>
 <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/40 px-2 py-0.5 rounded uppercase truncate">
 Total Vendor Expense
 </span>
 </div>
 <p className="text-xl font-bold truncate">{formatCurrency(totalVendorCost)}</p>
 </div>

 <div className="flex-1 min-w-0 bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm">
 <div className="flex items-center justify-between mb-1">
 <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
 <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
 </div>
 <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded uppercase truncate">
 Unique Vendors
 </span>
 </div>
 <p className="text-xl font-bold truncate">{vendorData.length}</p>
 </div>
 </div>
 </div>
 </div>

 {isLoading ? (
 <div className="flex justify-center items-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-green-600" />
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
 <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm h-[340px] flex flex-col">
 <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground uppercase tracking-wider">
 <Building2 className="w-4 h-4 text-blue-500" />
 Costs per Vendor
 </h3>
 <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 bg-white dark:bg-neutral-800 z-10">
 <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-neutral-100 dark:border-neutral-700">
 <th className="pb-2">Vendor Name</th>
 <th className="pb-2 text-right">Repairs/Parts</th>
 <th className="pb-2 text-right">Total Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
 {vendorData.length > 0 ? (
 vendorData.map((item, index) => (
 <tr
 key={item.vendorName}
 onClick={() => setSelectedVendor(item)}
 className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors cursor-pointer"
 title="View repair/part details"
 >
 <td className="py-2.5">
 <div className="flex items-center gap-2">
 <div
 className="w-2 h-2 rounded-full"
 style={{ backgroundColor: COLORS[index % COLORS.length] }}
 />
 <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
 {item.vendorName}
 </span>
 </div>
 </td>
 <td className="py-2.5 text-right">
 <span className="text-xs text-muted-foreground">{item.count}</span>
 </td>
 <td className="py-2.5 text-right">
 <span className="text-sm font-bold text-foreground">
 {formatCurrency(item.totalAmount)}
 </span>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td
 colSpan={3}
 className="py-12 text-center text-muted-foreground text-xs italic"
 >
 No vendor data available
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm h-[340px]">
 <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground uppercase tracking-wider">
 <PieIcon className="w-4 h-4 text-orange-500" />
 Vendor Distribution
 </h3>
 <div className="h-[260px] w-full">
 {vendorPieData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={vendorPieData}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={90}
 paddingAngle={3}
 dataKey="value"
 >
 {vendorPieData.map((_entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip
 formatter={(value: unknown) => formatCurrency((value as number) || 0)}
 contentStyle={{
 backgroundColor: 'rgba(255, 255, 255, 0.98)',
 borderRadius: '8px',
 border: 'none',
 fontSize: '12px',
 boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
 }}
 />
 <Legend
 iconType="circle"
 wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
 />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40">
 <PieIcon className="w-12 h-12 mb-3" />
 <p className="text-xs font-medium">No distribution data</p>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </>
 )}

 {/* Vendor Detail Modal */}
 {selectedVendor && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
 <div className="flex items-center justify-between p-5 border-b border-neutral-200/60 dark:border-neutral-700/60">
 <div>
 <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
 <Building2 className="w-5 h-5 text-blue-500" />
 {selectedVendor.vendorName}
 </h2>
 <p className="text-xs text-muted-foreground mt-1">
 {selectedVendor.count ?? selectedVendor.details?.length ?? 0} repair
 {(selectedVendor.count ?? selectedVendor.details?.length ?? 0) === 1 ? '' : 's'} ·{' '}
 {formatCurrency(selectedVendor.totalAmount ?? 0)} total
 </p>
 </div>
 <button
 type="button"
 onClick={() => setSelectedVendor(null)}
 className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="overflow-y-auto flex-1">
 {(selectedVendor.details?.length ?? 0) > 0 ? (
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900/60 z-10">
 <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-neutral-200 dark:border-neutral-700">
 <th className="px-4 py-2.5">Part Name</th>
 <th className="px-4 py-2.5">Machine</th>
 <th className="px-4 py-2.5 text-right">Quantity</th>
 <th className="px-4 py-2.5 text-right">Cost</th>
 <th className="px-4 py-2.5">Warranty From</th>
 <th className="px-4 py-2.5">Warranty To</th>
 <th className="px-4 py-2.5">Date</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
 {(selectedVendor.details ?? []).map((d) => (
 <tr
 key={d.id}
 className="hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
 >
 <td className="px-4 py-2.5">
 <div className="flex items-center gap-2">
 <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
 <span className="text-xs font-medium text-foreground">
 {d.partName}
 </span>
 </div>
 </td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground">
 {d.machineName ?? '—'}
 </td>
 <td className="px-4 py-2.5 text-right text-xs text-foreground">
 {d.quantity ?? '—'}
 </td>
 <td className="px-4 py-2.5 text-right">
 {(d.cost ?? 0) > 0 ? (
 <span className="text-xs font-bold text-foreground">
 {formatCurrency(d.cost)}
 </span>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 </td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground">
 {formatDate(d.warrantyFromDate)}
 </td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground">
 {formatDate(d.warrantyToDate)}
 </td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
 {formatDate(d.date)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 ) : (
 <div className="flex flex-col items-center justify-center text-muted-foreground py-16">
 <Package className="w-10 h-10 mb-3 opacity-20" />
 <p className="text-sm">No itemized details available</p>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
