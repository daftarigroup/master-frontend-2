import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, FileSpreadsheet, FileDown, Printer, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const COLUMNS = [
  { key: 'sn', label: 'Request No.' },
  { key: 'date', label: 'Date' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'personName', label: 'Employee' },
  { key: 'direction', label: 'In / Out' },
  { key: 'groupHead', label: 'Category / Department' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'approvedBy', label: 'Approved By' },
];

export const ReportTable: React.FC<{ rows: any[]; totals: any; projectName: string; filters: any }> = ({
  rows,
  totals,
  projectName,
  filters,
}) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const searched = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      [row.sn, row.personName, row.projectName, row.groupHead, row.status, row.approvedBy, row.remarks].some(
        (field) => field && String(field).toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    const copy = [...searched];
    copy.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'amount') {
        av = Number(av || 0);
        bv = Number(bv || 0);
      } else {
        av = (av ?? '').toString().toLowerCase();
        bv = (bv ?? '').toString().toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [searched, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
      {/* In / Out / Net summary */}
      {totals && (
        <div className="grid grid-cols-3 divide-x border-b">
          <div className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold flex items-center justify-center gap-1">
              <ArrowDownCircle size={12} className="text-emerald-500" /> Total In
            </p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(totals.totalIn)}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold flex items-center justify-center gap-1">
              <ArrowUpCircle size={12} className="text-rose-500" /> Total Out
            </p>
            <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(totals.totalOut)}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Net</p>
            <p
              className={`text-base font-bold mt-0.5 ${
                totals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(totals.net)}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="p-3 px-4 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center border-b bg-muted/20">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search request no, employee, category..."
            className="w-full pl-8 pr-2.5 py-1.5 border border-input bg-background rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => exportToExcel(sorted, projectName)}
            disabled={sorted.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition disabled:opacity-40"
          >
            <FileSpreadsheet size={13} /> Export Excel
          </button>
          <button
            onClick={() => exportToPDF(sorted, projectName, filters)}
            disabled={sorted.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition disabled:opacity-40"
          >
            <FileDown size={13} /> Export PDF
          </button>
          <button
            onClick={() => window.print()}
            disabled={sorted.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/20 transition disabled:opacity-40"
          >
            <Printer size={13} /> Print Report
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2 cursor-pointer select-none whitespace-nowrap hover:text-primary transition-colors"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown size={10} className={sortKey === col.key ? 'text-primary' : 'text-muted-foreground/40'} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((row) => (
              <tr key={row.id} className="hover:bg-accent/40 transition-colors">
                <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{row.sn}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(row.date)}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.projectName || '-'}</td>
                <td className="px-3 py-2 font-bold text-foreground uppercase tracking-tight whitespace-nowrap">
                  {row.personName}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.direction === 'IN' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded text-[10px] font-semibold">
                      <ArrowDownCircle size={11} /> In
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 rounded text-[10px] font-semibold">
                      <ArrowUpCircle size={11} /> Out
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.groupHead ? (
                    <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium text-foreground">
                      {row.groupHead}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">-</span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 font-bold whitespace-nowrap ${
                    row.direction === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {row.direction === 'IN' ? '+' : '-'}
                  {formatCurrency(row.amount)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.approvedBy || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-xs italic">
            No transactions match the current filters/search.
          </div>
        )}
      </div>

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="px-3 py-2 border-t bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-input bg-background rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {[10, 15, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>
              {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sorted.length)} of{' '}
              {sorted.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-0.5 border rounded bg-background disabled:opacity-40 hover:bg-accent"
            >
              Prev
            </button>
            <span className="text-xs px-2">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-0.5 border rounded bg-background disabled:opacity-40 hover:bg-accent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTable;
