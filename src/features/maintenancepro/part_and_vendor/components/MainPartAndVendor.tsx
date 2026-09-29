'use client';

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Loader2,
  Package,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getPublicFileUrl } from '@/lib/utils';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { usePermissions } from '@/hooks/usePermissions';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import {
  useDeletePartAndVendorMutation,
  useMachineTypesQuery,
  usePartsAndVendorsFiltersQuery,
  usePartsAndVendorsQuery,
} from '../server/tanstackQuery/usePartAndVendorQueries';
import type { MachineRepair } from '../types/types';

export default function MainPartAndVendor() {
  const requireCompanySelected = useRequireCompanySelected();
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [partFilter, setPartFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRepair, setSelectedRepair] = useState<MachineRepair | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const limit = 20;

  // We'll use a generic system key for now, or you can adjust to match your RBAC
  const { canRead, isAdmin, isSuperAdmin } = usePermissions('maintenancepro', 'repair');
  const canDeleteRepair = isAdmin || isSuperAdmin;

  const { data, isLoading } = usePartsAndVendorsQuery(
    page,
    limit,
    searchTerm,
    vendorFilter,
    partFilter,
    typeFilter
  );

  const { data: filtersData } = usePartsAndVendorsFiltersQuery();
  const { data: dbMachineTypes = [] } = useMachineTypesQuery();
  const deleteMutation = useDeletePartAndVendorMutation();

  const { effectivePermittedFirms } = useProject();
  const rawRepairs = (data?.data || []) as MachineRepair[];
  const repairs: MachineRepair[] = useMemo(() => {
    return filterByFirmAccess(rawRepairs, effectivePermittedFirms);
  }, [rawRepairs, effectivePermittedFirms]);

  const totalCount = data?.totalCount || 0;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(1);
  };

  const clearFilters = () => {
    setVendorFilter('');
    setPartFilter('');
    setTypeFilter('');
    setSearchTerm('');
    setPage(1);
  };

  const handleDelete = async (partRowId: string) => {
    if (!requireCompanySelected()) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this record?');
    if (!confirmDelete) return;

    try {
      toast.loading('Deleting...', { id: 'delete' });

      const success = await deleteMutation.mutateAsync(partRowId);

      if (!success) {
        toast.error('Failed to delete record', { id: 'delete' });
        return;
      }

      toast.success('Record deleted successfully', { id: 'delete' });
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong', { id: 'delete' });
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (_e) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToExcel = () => {
    const headers = [
      'Task ID',
      'Type',
      'Machine Name',
      'Part Replaced',
      'Vendor',
      'Qty',
      'Bill Amount',
      'Purchase Date',
      'Warranty',
      'Work Done',
      'Issue Detail',
      'Completed By',
      'Completion Date',
    ];

    const rows = repairs.map((r) => [
      r.task_id,
      r.machine_type || '',
      r.machine_name || '',
      r.part_replaced || '',
      r.vendor_name || '',
      r.qty || '',
      r.bill_amount || '',
      formatDate(r.purchase_date),
      r.warranty_start_date ? `${r.warranty_start_date} to ${r.warranty_end_date || 'N/A'}` : '',
      r.work_done || '',
      r.issue_detail || '',
      r.assigned_to || '',
      formatDate(r.actual_date),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `part_and_vendor_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(totalCount / limit);

  // Calculate total cost — dedupe by task_id since bill_amount is per-repair, not per-part
  const totalCost = Array.from(
    new Map(repairs.map((r) => [r.task_id, r.bill_amount || 0])).values()
  ).reduce((sum, amount) => sum + amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100 p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Permission check
  if (!canRead && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground p-12">
        Access Denied. You do not have permission to view Parts and Vendors.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Part And Vendor</h1>
          <p className="text-muted-foreground">
            Track purchased parts, vendors, and warranty details
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
              isFilterOpen || vendorFilter || partFilter
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                : 'bg-white text-foreground border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-600 dark:hover:bg-neutral-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            {(vendorFilter || partFilter || typeFilter) && (
              <span className="flex items-center justify-center w-5 h-5 ml-1 text-xs text-white bg-green-600 rounded-full">
                {(vendorFilter ? 1 : 0) + (partFilter ? 1 : 0) + (typeFilter ? 1 : 0)}
              </span>
            )}
            Filters
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center gap-6 justify-between lg:justify-start">
        <div className="flex items-center gap-3 min-w-50">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Entries</p>
            <p className="text-xl font-bold text-foreground">{totalCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 min-w-50">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <IndianRupee className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Bill Cost</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalCost)}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by part name, vendor, machine..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* Filters Panel */}
        {isFilterOpen && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Machine Type Filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Machine Type</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Types</option>
                {dbMachineTypes.map((typeObj) => (
                  <option key={typeObj.type_name} value={typeObj.type_name}>
                    {typeObj.type_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Vendor</label>
              <select
                value={vendorFilter}
                onChange={(e) => {
                  setVendorFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Vendors</option>
                {filtersData?.vendors.map((vendor: string) => (
                  <option key={vendor} value={vendor}>
                    {vendor}
                  </option>
                ))}
              </select>
            </div>

            {/* Part Filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Part Replaced</label>
              <select
                value={partFilter}
                onChange={(e) => {
                  setPartFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Parts</option>
                {filtersData?.parts.map((part: string) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(vendorFilter !== '' || partFilter !== '' || typeFilter !== '') && (
              <div className="col-span-1 md:col-span-3 flex justify-end mt-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-1"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : repairs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No parts or vendors found matching the criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Machine Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Machine Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Part Replaced
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Bill Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Purchase Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Warranty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {repairs.map((repair: MachineRepair, index: number) => (
                    <tr
                      key={repair.part_row_id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {repair.machine_type || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {repair.machine_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {repair.part_replaced || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {repair.vendor_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{repair.qty || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {formatCurrency(repair.bill_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(repair.purchase_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                        {repair.warranty_start_date
                          ? `${formatDate(repair.warranty_start_date)} to ${formatDate(repair.warranty_end_date)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(repair.actual_date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Details Button */}
                          <button
                            onClick={() => setSelectedRepair(repair)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
                          </button>

                          {/* Delete Button */}
                          {canDeleteRepair && (
                            <button
                              onClick={() => handleDelete(repair.part_row_id)}
                              disabled={deleteMutation.isPending}
                              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3 p-4">
              {repairs.map((repair: MachineRepair, index: number) => (
                <div
                  key={repair.part_row_id}
                  className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 space-y-3 border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        #{(page - 1) * limit + index + 1}
                      </p>
                      <p className="font-semibold text-foreground text-sm truncate">
                        {repair.part_replaced || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {repair.vendor_name || '-'}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground shrink-0 whitespace-nowrap">
                      {formatCurrency(repair.bill_amount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Machine Type</p>
                      <p className="text-sm text-foreground truncate">
                        {repair.machine_type || '-'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Machine Name</p>
                      <p className="text-sm text-foreground truncate">
                        {repair.machine_name || '-'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Qty</p>
                      <p className="text-sm text-foreground">{repair.qty || '-'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Purchase Date</p>
                      <p className="text-sm text-foreground">{formatDate(repair.purchase_date)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-sm text-foreground">{formatDate(repair.actual_date)}</p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs text-muted-foreground">Warranty</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        {repair.warranty_start_date
                          ? `${formatDate(repair.warranty_start_date)} to ${formatDate(repair.warranty_end_date)}`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    {/* Details Button */}
                    <button
                      onClick={() => setSelectedRepair(repair)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-foreground bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Details
                    </button>

                    {/* Delete Button */}
                    {canDeleteRepair && (
                      <button
                        onClick={() => handleDelete(repair.part_row_id)}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-sm text-muted-foreground text-center sm:text-left">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of{' '}
              {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Part & Vendor Info {selectedRepair.task_id}
              </h2>
              <button
                onClick={() => setSelectedRepair(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-1 sm:col-span-2 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-2">
                    Primary Detail
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-blue-600/80 dark:text-blue-400">Part Replaced</p>
                      <p className="font-semibold text-blue-900 dark:text-blue-100 text-lg break-words">
                        {selectedRepair.part_replaced || '-'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-blue-600/80 dark:text-blue-400">Vendor</p>
                      <p className="font-semibold text-blue-900 dark:text-blue-100 text-lg break-words">
                        {selectedRepair.vendor_name || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Warranty</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.warranty_start_date
                      ? `${formatDate(selectedRepair.warranty_start_date)} to ${formatDate(selectedRepair.warranty_end_date)}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bill Amount</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(selectedRepair.bill_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qty</p>
                  <p className="font-medium text-foreground">{selectedRepair.qty || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Date</p>
                  <p className="font-medium text-foreground">
                    {formatDate(selectedRepair.purchase_date)}
                  </p>
                </div>

                <div className="col-span-1 sm:col-span-2 border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Machine Reference
                  </h3>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Machine</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.machine_name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed On</p>
                  <p className="font-medium text-foreground">
                    {formatDate(selectedRepair.actual_date)}
                  </p>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Work Done</p>
                  <p className="font-medium text-foreground">{selectedRepair.work_done || '-'}</p>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Issue Detail</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.issue_detail || '-'}
                  </p>
                </div>

                {selectedRepair.remarks && (
                  <div className="col-span-1 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Remarks</p>
                    <p className="font-medium text-foreground p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg mt-1 border border-neutral-100 dark:border-neutral-800">
                      {selectedRepair.remarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Photos */}
              {(selectedRepair.photo_url || selectedRepair.bill_copy_url) && (
                <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Attachments
                  </h3>

                  {selectedRepair.photo_url && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Work Photo</p>
                      <div className="relative w-full h-48 sm:h-64 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                        <img
                          src={getPublicFileUrl(selectedRepair.photo_url)}
                          alt="Work photo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {selectedRepair.bill_copy_url && (
                    <div className="pt-2">
                      <a
                        href={getPublicFileUrl(selectedRepair.bill_copy_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                      >
                        <FileText className="w-4 h-4" />
                        Download Bill Copy
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-50 dark:bg-neutral-900/50">
              <button
                onClick={() => setSelectedRepair(null)}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
