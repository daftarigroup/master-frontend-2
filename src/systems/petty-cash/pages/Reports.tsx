import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FileBarChart2, Loader2, FolderSearch } from 'lucide-react';
import { expensesApi, creditsApi } from '../services/pettyCash.api';
import { fetchMasterOptions } from '@/services/masterService';
import { toDateOnly } from '../utils/helpers';
import { useProject } from '@/context/ProjectContext';
import ReportCharts from './ReportCharts';
import ReportTable from './ReportTable';

const EMPTY_FILTERS = {
  projectName: '',
  fromDate: '',
  toDate: '',
  personName: '',
  groupHead: '',
  status: '',
};

export const Reports: React.FC = () => {
  const { selectedProject } = useProject();
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    projectName: selectedProject && selectedProject.id !== 'all' ? selectedProject.name : '',
  }));

  useEffect(() => {
    if (selectedProject && selectedProject.id !== 'all') {
      setFilters((prev) => ({ ...prev, projectName: selectedProject.name }));
    }
  }, [selectedProject]);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);
  const [groupHeadOptions, setGroupHeadOptions] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [statusScopeExpenses, setStatusScopeExpenses] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const toArr = (r: any) => {
    const p = r?.data !== undefined ? r.data : r;
    if (Array.isArray(p)) return p;
    if (Array.isArray(p?.items)) return p.items;
    if (Array.isArray(p?.entries)) return p.entries;
    if (Array.isArray(p?.data)) return p.data;
    return [];
  };

  useEffect(() => {
    fetchMasterOptions()
      .then((opts) => {
        if (opts.firms?.length) setProjectOptions(opts.firms);
        if (opts.allGroupHeads?.length) setGroupHeadOptions(opts.allGroupHeads);
      })
      .catch((error: any) => {
        console.error(error);
        toast.error(error.message || 'Failed to load master options');
      })
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    if (!filters.projectName) {
      setStatusScopeExpenses([]);
      setCredits([]);
      setHasFetched(false);
      return;
    }

    setDataLoading(true);
    Promise.all([
      expensesApi.list({
        projectName: filters.projectName,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        personName: filters.personName || undefined,
        groupHead: filters.groupHead || undefined,
      }),
      filters.groupHead
        ? Promise.resolve({ data: [] })
        : creditsApi.list({
            projectName: filters.projectName,
            fromDate: filters.fromDate || undefined,
            toDate: filters.toDate || undefined,
            personName: filters.personName || undefined,
          }),
    ])
      .then(([expensesRes, creditsRes]: any) => {
        const expList = toArr(expensesRes);
        const crList = toArr(creditsRes);
        setStatusScopeExpenses(expList.map((e: any) => ({ ...e, date: toDateOnly(e.date) })));
        setCredits(crList.map((c: any) => ({ ...c, date: toDateOnly(c.date) })));
        setHasFetched(true);

        const emps = Array.from(
          new Set([...expList.map((e: any) => e.personName), ...crList.map((c: any) => c.personName)].filter(Boolean))
        );
        setEmployeeOptions(emps as string[]);
      })
      .catch((error: any) => {
        console.error(error);
        toast.error(error.message || 'Failed to load report data');
      })
      .finally(() => setDataLoading(false));
  }, [filters.projectName, filters.fromDate, filters.toDate, filters.personName, filters.groupHead]);

  const displayExpenses = useMemo(() => {
    if (!filters.status) return statusScopeExpenses;
    return statusScopeExpenses.filter((e) => e.status === filters.status);
  }, [statusScopeExpenses, filters.status]);

  const displayCredits = useMemo(() => {
    if (filters.status && filters.status !== 'APPROVED') return [];
    return credits;
  }, [credits, filters.status]);

  const transactions = useMemo(
    () => [
      ...displayCredits.map((c) => ({ ...c, direction: 'IN', groupHead: null, approvedBy: null })),
      ...displayExpenses.map((e) => ({ ...e, direction: 'OUT' })),
    ],
    [displayCredits, displayExpenses]
  );

  const totals = useMemo(() => {
    const totalIn = displayCredits.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalOut = displayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [displayCredits, displayExpenses]);

  const updateFilter = (key: string, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border rounded-lg p-4 shadow-xs flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <FileBarChart2 size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Financial & Spend Reports</h1>
            <p className="text-xs text-muted-foreground">Petty cash analytics and detailed breakdown per project</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg shadow-xs p-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Project Name <span className="text-destructive">*</span>
            </label>
            <select
              value={filters.projectName}
              onChange={(e) => updateFilter('projectName', e.target.value)}
              disabled={optionsLoading}
              className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
            >
              <option value="">Select Project</option>
              {projectOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => updateFilter('fromDate', e.target.value)}
              className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => updateFilter('toDate', e.target.value)}
              className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Employee</label>
            <select
              value={filters.personName}
              onChange={(e) => updateFilter('personName', e.target.value)}
              className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
            >
              <option value="">All Employees</option>
              {employeeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Category / Group</label>
            <select
              value={filters.groupHead}
              onChange={(e) => updateFilter('groupHead', e.target.value)}
              className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
            >
              <option value="">All Categories</option>
              {groupHeadOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {(filters.fromDate || filters.toDate || filters.personName || filters.groupHead || filters.status) && (
          <div className="mt-2.5 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-primary hover:underline transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!filters.projectName ? (
        <div className="bg-card border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center gap-2 print:hidden">
          <FolderSearch size={36} className="text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">Select a project to view its report</p>
          <p className="text-xs text-muted-foreground">Pick a project from the dropdown above to load data.</p>
        </div>
      ) : dataLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 print:hidden">
          <Loader2 size={28} className="text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading report data...</p>
        </div>
      ) : hasFetched && transactions.length === 0 ? (
        <div className="bg-card border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center gap-2">
          <FolderSearch size={36} className="text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">No transactions found</p>
          <p className="text-xs text-muted-foreground">No records match the current filters for "{filters.projectName}".</p>
        </div>
      ) : (
        <>
          <ReportCharts expenses={displayExpenses} statusScopeExpenses={statusScopeExpenses} />
          <ReportTable rows={transactions} totals={totals} projectName={filters.projectName} filters={filters} />
        </>
      )}
    </div>
  );
};

export default Reports;
