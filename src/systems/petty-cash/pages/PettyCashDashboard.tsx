import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, AlertCircle, Eye, ChevronLeft, ChevronRight, Search, Filter, X, ExternalLink } from 'lucide-react';
import {
  formatDate,
  formatCurrency,
  getPendingCount,
  getTodaysExpenses,
  getTodaysCredits,
  isDateInRange,
  toDateOnly,
} from '../utils/helpers';
import { creditsApi, expensesApi } from '../services/pettyCash.api';
import { previewFileInNewTab } from '@/utils/filePreview';
import { MacModal } from '@/components/ui/mac-modal';
import { useProject } from '@/context/ProjectContext';

export const PettyCashDashboard: React.FC = () => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    personName: '',
    groupHead: '',
    paymentMode: '',
    searchQuery: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  const [credits, setCredits] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      creditsApi.list(),
      expensesApi.list(),
    ])
      .then(([creditsRes, expensesRes]: any) => {
        const toArr = (r: any) => {
          const p = r?.data !== undefined ? r.data : r;
          if (Array.isArray(p)) return p;
          if (Array.isArray(p?.items)) return p.items;
          if (Array.isArray(p?.entries)) return p.entries;
          if (Array.isArray(p?.data)) return p.data;
          return [];
        };
        const creditList = toArr(creditsRes);
        const expenseList = toArr(expensesRes);
        setCredits(creditList.map((c: any) => ({ ...c, date: toDateOnly(c.date) })));
        setExpenses(expenseList.map((e: any) => ({ ...e, date: toDateOnly(e.date) })));
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.message || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

  const { selectedProject, matchesProject } = useProject();

  const scopedCredits = useMemo(() => {
    if (!selectedProject || selectedProject.id === 'all') return credits;
    return credits.filter(c => matchesProject(c.projectName || c.firm_name, c.firm_id));
  }, [credits, selectedProject, matchesProject]);

  const scopedExpenses = useMemo(() => {
    if (!selectedProject || selectedProject.id === 'all') return expenses;
    return expenses.filter(e => matchesProject(e.projectName || e.firm_name, e.firm_id));
  }, [expenses, selectedProject, matchesProject]);

  // Calculate statistics
  const totalCredit = scopedCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalExpense = scopedExpenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const availableBalance = totalCredit - totalExpense;
  const pendingApprovals = getPendingCount(scopedExpenses);
  const todaysExpense = getTodaysExpenses(scopedExpenses);
  const todaysCredit = getTodaysCredits(scopedCredits);

  const filteredTransactions = useMemo(() => {
    const transactions: any[] = [];

    // Add credits
    scopedCredits.forEach((c) => {
      if (!filters.dateFrom || !filters.dateTo || isDateInRange(c.date, filters.dateFrom, filters.dateTo)) {
        if (!filters.personName || c.personName?.toLowerCase().includes(filters.personName.toLowerCase())) {
          if (!filters.paymentMode || c.paymentMode === filters.paymentMode) {
            transactions.push({
              id: c.id,
              sn: c.sn,
              personName: c.personName,
              date: c.date,
              amount: parseFloat(c.amount),
              mode: c.paymentMode,
              type: 'CREDIT',
              groupHead: 'N/A',
              status: 'APPROVED',
              image: c.image || '',
              remarks: c.remarks || '',
            });
          }
        }
      }
    });

    // Add expenses
    scopedExpenses.forEach((e) => {
      if (!filters.dateFrom || !filters.dateTo || isDateInRange(e.date, filters.dateFrom, filters.dateTo)) {
        if (!filters.personName || e.personName?.toLowerCase().includes(filters.personName.toLowerCase())) {
          if (!filters.groupHead || e.groupHead === filters.groupHead) {
            if (!filters.paymentMode || e.paymentMode === filters.paymentMode) {
              if (e.status === 'APPROVED') {
                transactions.push({
                  id: e.id,
                  sn: e.sn,
                  personName: e.personName,
                  date: e.date,
                  amount: -parseFloat(e.amount),
                  mode: e.paymentMode,
                  type: 'EXPENSE',
                  groupHead: e.groupHead,
                  status: e.status,
                  image: e.image || '',
                  remarks: e.remarks || '',
                });
              }
            }
          }
        }
      }
    });

    // Apply Search Query
    const filtered = transactions.filter((t) => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          (t.personName && t.personName.toLowerCase().includes(q)) ||
          (t.remarks && t.remarks.toLowerCase().includes(q)) ||
          (t.amount && String(t.amount).toLowerCase().includes(q)) ||
          (t.mode && t.mode.toLowerCase().includes(q)) ||
          (t.groupHead && t.groupHead.toLowerCase().includes(q)) ||
          (t.sn && String(t.sn).toLowerCase().includes(q))
        );
      }
      return true;
    });

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filters, credits, expenses]);

  // Paginated Transactions
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const handleDownloadCSV = () => {
    const headers = ['SN', 'Date', 'Person', 'Type', 'Amount', 'Mode', 'Group', 'Remarks'];
    const rows = filteredTransactions.map((t) => [
      t.sn,
      formatDate(t.date),
      t.personName,
      t.type,
      Math.abs(t.amount),
      t.mode,
      t.groupHead,
      t.remarks || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Chart data - Expense by Group Head
  const expenseByGroupHead = useMemo(() => {
    const groupData: Record<string, number> = {};
    expenses
      .filter((e) => e.status === 'APPROVED')
      .forEach((e) => {
        if (!groupData[e.groupHead]) {
          groupData[e.groupHead] = 0;
        }
        groupData[e.groupHead] += parseFloat(e.amount);
      });
    return groupData;
  }, [expenses]);

  const handleImageView = (image: string) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="bg-card border rounded-lg p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 w-full">
          <div className="flex flex-col lg:flex-row w-full gap-2 items-center">
            {/* Search + Export Row */}
            <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
                <input
                  type="text"
                  placeholder="Search details..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  className="w-full bg-background border border-input rounded-md pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs h-9"
                />
              </div>
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className={`lg:hidden flex items-center justify-center rounded-md border h-9 w-9 shrink-0 transition ${
                  showMobileFilters ? 'bg-primary/10 text-primary border-primary' : 'bg-background border-input text-muted-foreground'
                }`}
              >
                <Filter size={14} />
              </button>
              <button
                onClick={handleDownloadCSV}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center justify-center lg:hidden h-9 w-9 shrink-0 shadow-xs transition"
              >
                <TrendingUp size={16} className="rotate-90" />
              </button>
            </div>

            {/* Filters */}
            <div
              className={`${
                showMobileFilters ? 'grid' : 'hidden'
              } lg:flex grid-cols-2 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[4] items-center`}
            >
              <input
                type="date"
                placeholder="From Date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="date"
                placeholder="To Date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                value={filters.personName}
                onChange={(e) => setFilters({ ...filters, personName: e.target.value })}
                placeholder="Search person..."
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={filters.groupHead}
                onChange={(e) => setFilters({ ...filters, groupHead: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Groups</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Marketing">Marketing</option>
              </select>
              <select
                value={filters.paymentMode}
                onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="hidden lg:flex bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 h-9 rounded-md text-xs font-semibold items-center justify-center gap-1.5 transition shadow-xs shrink-0"
          >
            <TrendingUp size={14} className="rotate-90" /> Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-emerald-200 dark:border-emerald-950/60 bg-emerald-500/5 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Total Credit</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalCredit)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Today: {formatCurrency(todaysCredit)}</p>
            </div>
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-rose-200 dark:border-rose-950/60 bg-rose-500/5 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Total Expense</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(totalExpense)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Today: {formatCurrency(todaysExpense)}</p>
            </div>
            <div className="p-2 rounded-md bg-rose-500/10 text-rose-600">
              <TrendingDown size={22} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-blue-200 dark:border-blue-950/60 bg-blue-500/5 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Available Balance</p>
              <p
                className={`text-xl font-bold mt-1 ${
                  availableBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {formatCurrency(availableBalance)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Net Float Amount</p>
            </div>
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
              <AlertCircle size={22} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-purple-200 dark:border-purple-950/60 bg-purple-500/5 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Pending Approvals</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{pendingApprovals}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Expenses awaiting sign-off</p>
            </div>
            <div className="p-2 rounded-md bg-purple-500/10 text-purple-600">
              <AlertCircle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts / Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense by Group Head */}
        <div className="bg-card rounded-lg p-4 border shadow-xs">
          <h3 className="text-sm font-bold text-foreground mb-3">Expense by Group Head</h3>
          <div className="space-y-2">
            {Object.entries(expenseByGroupHead).length > 0 ? (
              Object.entries(expenseByGroupHead).map(([group, amount]) => {
                const maxAmount = Math.max(...Object.values(expenseByGroupHead));
                const percentage = (amount / maxAmount) * 100;
                return (
                  <div key={group}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{group}</span>
                      <span className="text-foreground font-semibold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-rose-500 to-amber-500 h-1.5 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-xs text-center py-4">No expense data</p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-card rounded-lg p-4 border shadow-xs">
          <h3 className="text-sm font-bold text-foreground mb-3">Summary Statistics</h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">Total Credits Logged</span>
              <span className="font-semibold text-emerald-600">{credits.length}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">Total Expenses Logged</span>
              <span className="font-semibold text-rose-600">{expenses.length}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">Approved Expenses</span>
              <span className="font-semibold">{expenses.filter((e) => e.status === 'APPROVED').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pending Expenses</span>
              <span className="font-semibold text-amber-600">{pendingApprovals}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Table */}
      <div className="bg-card rounded-lg border shadow-xs flex flex-col">
        <div className="p-3 px-4 border-b flex justify-between items-center bg-muted/30">
          <h3 className="text-sm font-bold text-foreground">Transaction Details Report</h3>
          <span className="text-xs text-muted-foreground">
            Showing {paginatedTransactions.length} of {filteredTransactions.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="px-3 py-2">SN</th>
                <th className="px-3 py-2 text-center">Date</th>
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2 text-center">Type</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-center">Mode</th>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2 text-center">Receipt</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTransactions.map((t, idx) => (
                <tr key={t.id || idx} className="hover:bg-accent/40 transition-colors">
                  <td className="px-3 py-2 font-semibold text-foreground">{t.sn}</td>
                  <td className="px-3 py-2 text-muted-foreground text-center">{formatDate(t.date)}</td>
                  <td className="px-3 py-2 font-bold text-foreground uppercase tracking-tight">{t.personName}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        t.type === 'CREDIT'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2 font-bold text-right ${
                      t.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {t.type === 'CREDIT' ? '+' : '-'}
                    {formatCurrency(Math.abs(t.amount))}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium text-[11px]">
                      {t.mode}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-muted-foreground uppercase">{t.groupHead}</td>
                  <td className="px-3 py-2 text-center">
                    {t.image ? (
                      <button
                        onClick={() => handleImageView(t.image)}
                        className="text-primary hover:text-primary/80 transition"
                      >
                        <Eye size={15} className="inline" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground/40">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{t.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading transactions...' : 'No transactions found matching your criteria.'}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-2.5 px-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-background border border-input rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {[10, 15, 20, 50, 100].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 border rounded bg-background disabled:opacity-40 hover:bg-accent transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs px-2 font-medium">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 border rounded bg-background disabled:opacity-40 hover:bg-accent transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <MacModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title="Receipt Preview"
        subtitle="Attached voucher transaction proof"
        maxWidth="xl"
        bodyClassName="p-6 flex justify-center bg-muted/10"
        footer={
          <div className="flex justify-between items-center w-full">
            <span className="text-[11px] text-muted-foreground">Preview transaction voucher</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => previewFileInNewTab(selectedImage, 'receipt')}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-xs"
              >
                <ExternalLink size={13} /> Open in New Tab
              </button>
            </div>
          </div>
        }
      >
        <img
          src={selectedImage}
          alt="Transaction Receipt"
          className="w-full max-h-[70vh] object-contain rounded-xl border border-border/60 shadow-sm"
        />
      </MacModal>
    </div>
  );
};

export default PettyCashDashboard;
