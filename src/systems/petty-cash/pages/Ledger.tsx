import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Download, Search, ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ledgerApi } from '../services/pettyCash.api';
import { formatDate, formatCurrency, isDateInRange, toDateOnly } from '../utils/helpers';

export const Ledger: React.FC = () => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    personName: '',
    transactionType: '',
    searchQuery: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ledgerApi
      .list({ limit: 1000 })
      .then((ledgerRes: any) => {
        const payload = ledgerRes?.data !== undefined ? ledgerRes.data : ledgerRes;
        const entries = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.entries)
          ? payload.entries
          : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(ledgerRes?.entries)
          ? ledgerRes.entries
          : [];
        setLedgerData(entries.map((entry: any) => ({ ...entry, date: toDateOnly(entry.date) })));
      })
      .catch((error: any) => {
        console.error(error);
        toast.error(error.message || 'Failed to load ledger');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLedger = useMemo(() => {
    return ledgerData
      .filter((entry) => {
        if (filters.dateFrom || filters.dateTo) {
          if (!isDateInRange(entry.date, filters.dateFrom, filters.dateTo)) {
            return false;
          }
        }
        if (filters.personName && entry.personName !== filters.personName) {
          return false;
        }
        if (filters.transactionType && entry.type !== filters.transactionType) {
          return false;
        }
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const match =
            (entry.personName && entry.personName.toLowerCase().includes(q)) ||
            (entry.date && String(entry.date).includes(q)) ||
            (entry.type && entry.type.toLowerCase().includes(q)) ||
            (entry.amount && String(entry.amount).toLowerCase().includes(q)) ||
            (entry.referenceId && entry.referenceId.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledgerData, filters]);

  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);
  const paginatedLedger = filteredLedger.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statistics = useMemo(() => {
    const totalDebit = filteredLedger
      .filter((e) => e.type === 'CREDIT')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalCredit = filteredLedger
      .filter((e) => e.type === 'EXPENSE')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    return {
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
      entries: filteredLedger.length,
    };
  }, [filteredLedger]);

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Person Name', 'Type', 'Amount', 'Balance After', 'Description'];
    const rows = filteredLedger.map((entry) => [
      formatDate(entry.date),
      entry.personName,
      entry.type,
      entry.amount,
      entry.balance !== undefined ? entry.balance : entry.balanceAfter,
      `Ref: ${entry.referenceId || '-'}`,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const personNames = Array.from(new Set(ledgerData.map((e) => e.personName).filter(Boolean)));

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="bg-card border rounded-lg p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 w-full">
          <div className="flex flex-col lg:flex-row w-full gap-2 items-center">
            <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
                <input
                  type="text"
                  placeholder="Search ref ID, person, amount..."
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
                <Download size={15} />
              </button>
            </div>

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
              <select
                value={filters.personName}
                onChange={(e) => setFilters({ ...filters, personName: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Persons</option>
                {personNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={filters.transactionType}
                onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Types</option>
                <option value="CREDIT">Credit</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="hidden lg:flex bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 h-9 rounded-md text-xs font-semibold items-center justify-center gap-1.5 transition shadow-xs shrink-0"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-emerald-200 dark:border-emerald-950/60 bg-emerald-500/5 rounded-lg p-3.5 shadow-xs">
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Total Credits</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(statistics.totalDebit)}
          </p>
        </div>
        <div className="bg-card border border-rose-200 dark:border-rose-950/60 bg-rose-500/5 rounded-lg p-3.5 shadow-xs">
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Total Expenses</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(statistics.totalCredit)}
          </p>
        </div>
        <div className="bg-card border border-blue-200 dark:border-blue-950/60 bg-blue-500/5 rounded-lg p-3.5 shadow-xs">
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Net Balance</p>
          <p
            className={`text-lg font-bold mt-1 ${
              statistics.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatCurrency(statistics.balance)}
          </p>
        </div>
        <div className="bg-card border border-purple-200 dark:border-purple-950/60 bg-purple-500/5 rounded-lg p-3.5 shadow-xs">
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Total Entries</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{statistics.entries}</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-card rounded-lg border shadow-xs flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="px-3 py-2 text-center">Date</th>
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2 text-center">Type</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Running Balance</th>
                <th className="px-3 py-2 text-center">Ref ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedLedger.map((entry) => (
                <tr key={entry.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-3 py-2 text-center text-muted-foreground">{formatDate(entry.date)}</td>
                  <td className="px-3 py-2 font-bold text-foreground uppercase tracking-tight">{entry.personName}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        entry.type === 'CREDIT'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      entry.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {entry.type === 'CREDIT' ? '+' : '-'}
                    {formatCurrency(entry.amount)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      (entry.balance !== undefined ? entry.balance : entry.balanceAfter) >= 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {formatCurrency(entry.balance !== undefined ? entry.balance : entry.balanceAfter)}
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground font-mono text-[11px]">
                    {entry.referenceId || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLedger.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading ledger...' : 'No ledger entries found.'}
          </div>
        )}

        {/* Footer */}
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
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border rounded bg-background disabled:opacity-40 hover:bg-accent transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs px-2 font-medium">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 border rounded bg-background disabled:opacity-40 hover:bg-accent transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
