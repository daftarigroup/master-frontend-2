import React, { useState, useRef, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  Eye,
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  XCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchMasterOptions } from '@/services/masterService';
import { creditsApi, expensesApi } from '../services/pettyCash.api';
import { previewFileInNewTab } from '@/utils/filePreview';
import { MacModal } from '@/components/ui/mac-modal';
import {
  formatDate,
  formatCurrency,
  fileToBase64,
  getTodayDate,
  toDateOnly,
} from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';
import ImageUploadField from '../components/ImageUploadField';

const EMPTY_CREDIT_FORM = (userName?: string) => ({
  personName: userName || '',
  projectName: '',
  date: getTodayDate(),
  amount: '',
  paymentMode: 'Cash',
  groupHead: 'Direct',
  remarks: '',
});

const EMPTY_EXPENSE_FORM = (userName?: string) => ({
  personName: userName || '',
  projectName: '',
  date: getTodayDate(),
  amount: '',
  paymentMode: 'Cash',
  groupHead: '',
  remarks: '',
});

export const AddCase: React.FC = () => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [entryType, setEntryType] = useState<'CREDIT' | 'EXPENSE'>('CREDIT');
  const [creditForm, setCreditForm] = useState(EMPTY_CREDIT_FORM(user?.username || (user as any)?.name));
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM(user?.username || (user as any)?.name));

  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [historyStatus, setHistoryStatus] = useState('');

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    personName: '',
    mode: '',
    groupHead: '',
    type: '',
    searchQuery: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab, historyStatus]);

  const [credits, setCredits] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projectList, setProjectList] = useState<string[]>([]);
  const [groupHeadList, setGroupHeadList] = useState<string[]>([
    'IT',
    'HR',
    'Finance',
    'Operations',
    'Marketing',
  ]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = async () => {
    try {
      const [creditsRes, expensesRes, masterOpts]: any = await Promise.all([
        creditsApi.list(),
        expensesApi.list(),
        fetchMasterOptions().catch(() => null),
      ]);

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

      if (masterOpts?.firms?.length) {
        setProjectList(masterOpts.firms);
      }
      if (masterOpts?.allGroupHeads?.length) {
        setGroupHeadList(masterOpts.allGroupHeads);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to load data');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearAttachedImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSwitchType = (type: 'CREDIT' | 'EXPENSE') => {
    if (type === entryType) return;
    setEntryType(type);
    clearAttachedImage();
  };

  // Balance for selected person
  const selectedPersonBalance = useMemo(() => {
    if (entryType !== 'EXPENSE' || !expenseForm.personName) return 0;
    const creditAmt = credits
      .filter((c) => c.personName === expenseForm.personName)
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    const expenseAmt = expenses
      .filter((e) => e.personName === expenseForm.personName && e.status === 'APPROVED')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    return creditAmt - expenseAmt;
  }, [entryType, expenseForm.personName, credits, expenses]);

  // Combined entries
  const entries = useMemo(() => {
    const creditEntries = credits.map((c) => ({ ...c, type: 'CREDIT', groupHead: null }));
    const expenseEntries = expenses.map((e) => ({ ...e, type: 'EXPENSE' }));
    return [...creditEntries, ...expenseEntries].sort(
      (a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
    );
  }, [credits, expenses]);

  const pendingEntries = entries.filter((e) => e.status === 'PENDING');
  const historyEntries = entries.filter((e) => e.status !== 'PENDING');

  const tabEntries = activeTab === 'pending' ? pendingEntries : historyEntries;

  const filteredEntries = tabEntries.filter((entry) => {
    if (activeTab === 'history' && historyStatus && entry.status !== historyStatus) return false;
    if (filters.fromDate && entry.date < filters.fromDate) return false;
    if (filters.toDate && entry.date > filters.toDate) return false;
    if (filters.personName && entry.personName !== filters.personName) return false;
    if (filters.mode && entry.paymentMode !== filters.mode) return false;
    if (filters.groupHead && entry.groupHead !== filters.groupHead) return false;
    if (filters.type && entry.type !== filters.type) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        (entry.sn && String(entry.sn).toLowerCase().includes(q)) ||
        (entry.personName && entry.personName.toLowerCase().includes(q)) ||
        (entry.projectName && entry.projectName.toLowerCase().includes(q)) ||
        (entry.date && String(entry.date).includes(q)) ||
        (entry.amount && String(entry.amount).toLowerCase().includes(q)) ||
        (entry.paymentMode && entry.paymentMode.toLowerCase().includes(q)) ||
        (entry.groupHead && entry.groupHead.toLowerCase().includes(q)) ||
        (entry.remarks && entry.remarks.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const sortedEntries = filteredEntries.slice().reverse();
  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const sumByType = (list: any[], type: string) =>
    list.filter((e) => e.type === type).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const pageTotalCredit = sumByType(paginatedEntries, 'CREDIT');
  const pageTotalExpense = sumByType(paginatedEntries, 'EXPENSE');
  const totalCredit = sumByType(sortedEntries, 'CREDIT');
  const totalExpense = sumByType(sortedEntries, 'EXPENSE');

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setImage(base64);
      setImagePreview(base64);
    } catch (error) {
      toast.error('Error reading image');
    }
  };

  const handleSubmitCredit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!creditForm.personName.trim()) {
      toast.error('Please enter person name');
      return;
    }
    if (!creditForm.amount || parseFloat(creditForm.amount) <= 0) {
      toast.error('Please enter valid credit amount');
      return;
    }

    try {
      setLoading(true);

      await creditsApi.create({
        personName: creditForm.personName,
        projectName: creditForm.projectName || undefined,
        date: creditForm.date,
        amount: parseFloat(creditForm.amount),
        paymentMode: creditForm.paymentMode,
        image: image || undefined,
        remarks: creditForm.remarks || undefined,
      });

      await loadData();
      toast.success(`Credit of ${formatCurrency(parseFloat(creditForm.amount))} added successfully!`);

      setCreditForm(EMPTY_CREDIT_FORM(user?.username || (user as any)?.name));
      clearAttachedImage();
      setShowFormModal(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error adding credit');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expenseForm.personName.trim()) {
      toast.error('Please enter person name');
      return;
    }
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      toast.error('Please enter valid expense amount');
      return;
    }
    if (parseFloat(expenseForm.amount) > selectedPersonBalance) {
      toast.error(`Insufficient Balance! Available: ${formatCurrency(selectedPersonBalance)}`);
      return;
    }

    try {
      setLoading(true);

      await expensesApi.create({
        personName: expenseForm.personName,
        projectName: expenseForm.projectName || undefined,
        date: expenseForm.date,
        amount: parseFloat(expenseForm.amount),
        paymentMode: expenseForm.paymentMode,
        groupHead: expenseForm.groupHead,
        image: image || undefined,
        remarks: expenseForm.remarks || undefined,
      });

      await loadData();
      toast.success(`Expense of ${formatCurrency(parseFloat(expenseForm.amount))} submitted for approval!`);

      setExpenseForm(EMPTY_EXPENSE_FORM(user?.username || (user as any)?.name));
      clearAttachedImage();
      setShowFormModal(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error submitting expense');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExpense = async (expense: any) => {
    try {
      await expensesApi.updateStatus(expense.id, 'APPROVED');
      await loadData();
      toast.success('Expense approved!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error approving expense');
    }
  };

  const handleRejectExpense = async (expense: any) => {
    try {
      await expensesApi.updateStatus(expense.id, 'REJECTED');
      await loadData();
      toast.success('Expense rejected!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error rejecting expense');
    }
  };

  const handleImageView = (imageBase64: string) => {
    setSelectedImage(imageBase64);
    setShowImageModal(true);
  };

  const allPersonNames = Array.from(new Set(entries.map((e) => e.personName).filter(Boolean)));

  return (
    <div className="space-y-4">
      {/* Header with Tabs + Filters */}
      <div className="bg-card border rounded-lg p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full">
          {/* Pending / History Tabs */}
          <div className="flex gap-1.5 w-full lg:w-auto shrink-0 border-b lg:border-none pb-2 lg:pb-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-1.5 px-3 font-bold transition text-xs rounded-md whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Pending Approval ({pendingEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-1.5 px-3 font-bold transition text-xs rounded-md whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              History Log ({historyEntries.length})
            </button>
          </div>

          <div className="flex flex-col lg:flex-row w-full gap-2 items-center flex-1">
            <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
                <input
                  type="text"
                  placeholder="Search entries..."
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
                onClick={() => setShowFormModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center justify-center lg:hidden h-9 w-9 shrink-0 shadow-xs transition"
              >
                <Plus size={16} />
              </button>
            </div>

            <div
              className={`${
                showMobileFilters ? 'grid' : 'hidden'
              } lg:flex grid-cols-2 md:grid-cols-4 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[5] items-center`}
            >
              <input
                type="date"
                placeholder="From Date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="date"
                placeholder="To Date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={filters.personName}
                onChange={(e) => setFilters({ ...filters, personName: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Persons</option>
                {allPersonNames.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
              <select
                value={filters.mode}
                onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              <select
                value={filters.groupHead}
                onChange={(e) => setFilters({ ...filters, groupHead: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Group Heads</option>
                {groupHeadList.map((gh) => (
                  <option key={gh} value={gh}>
                    {gh}
                  </option>
                ))}
              </select>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Types</option>
                <option value="CREDIT">Credit</option>
                <option value="EXPENSE">Expense</option>
              </select>
              {activeTab === 'history' && (
                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowFormModal(true)}
            className="hidden lg:flex bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 h-9 rounded-md text-xs font-semibold items-center justify-center gap-1.5 transition shadow-xs shrink-0 whitespace-nowrap"
          >
            <Plus size={14} /> Add Entry
          </button>
        </div>
      </div>

      {/* Modal - Add Credit / Expense */}
      <MacModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title="New Cash Entry"
        subtitle={entryType === 'CREDIT' ? 'Credit — auto-approved cash in' : 'Expense — recorded cash disbursement'}
        maxWidth="md"
        bodyClassName="p-5 overflow-y-auto space-y-3.5 max-h-[82vh]"
      >
        <div className="space-y-3.5">
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSwitchType('EXPENSE')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border font-semibold text-xs transition ${
                entryType === 'EXPENSE'
                  ? 'bg-rose-500/10 border-rose-300 text-rose-600 dark:text-rose-400'
                  : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <ArrowUpCircle size={15} /> Expense (OUT)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchType('CREDIT')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border font-semibold text-xs transition ${
                entryType === 'CREDIT'
                  ? 'bg-emerald-500/10 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <ArrowDownCircle size={15} /> Credit (IN)
            </button>
          </div>

          {entryType === 'CREDIT' ? (
            <form onSubmit={handleSubmitCredit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Person Name *</label>
                  <input
                    type="text"
                    value={creditForm.personName}
                    onChange={(e) => setCreditForm({ ...creditForm, personName: e.target.value })}
                    placeholder="Enter person name"
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Payment Mode *</label>
                  <select
                    value={creditForm.paymentMode}
                    onChange={(e) => setCreditForm({ ...creditForm, paymentMode: e.target.value })}
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={creditForm.amount}
                    onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Date *</label>
                  <input
                    type="date"
                    value={creditForm.date}
                    onChange={(e) => setCreditForm({ ...creditForm, date: e.target.value })}
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Group Head</label>
                  <select
                    value={creditForm.groupHead}
                    onChange={(e) => setCreditForm({ ...creditForm, groupHead: e.target.value })}
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Direct">Direct</option>
                    <option value="Bank">Bank</option>
                    <option value="Client">Client</option>
                    <option value="Director">Director</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Project Name</label>
                  <select
                    value={creditForm.projectName}
                    onChange={(e) => setCreditForm({ ...creditForm, projectName: e.target.value })}
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Project</option>
                    {projectList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">Remarks</label>
                <textarea
                  value={creditForm.remarks}
                  onChange={(e) => setCreditForm({ ...creditForm, remarks: e.target.value })}
                  placeholder="Add any remarks..."
                  rows={2}
                  className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <ImageUploadField
                fileInputRef={fileInputRef}
                imagePreview={imagePreview}
                onSelect={handleImageSelect}
                onClear={clearAttachedImage}
                label="Upload Receipt (Optional)"
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 transition text-xs shadow-xs"
                >
                  {loading ? 'Submitting...' : 'Submit Credit'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreditForm(EMPTY_CREDIT_FORM(user?.username || (user as any)?.name))}
                  className="px-4 py-2 border rounded-md text-foreground hover:bg-muted transition text-xs"
                >
                  Reset
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitExpense} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Person Name *</label>
                  <input
                    type="text"
                    value={expenseForm.personName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, personName: e.target.value })}
                    placeholder="Enter person name"
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Payment Mode *</label>
                  <select
                    value={expenseForm.paymentMode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Date *</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Group Head *</label>
                  <select
                    value={expenseForm.groupHead}
                    onChange={(e) => setExpenseForm({ ...expenseForm, groupHead: e.target.value })}
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Select Group Head</option>
                    {groupHeadList.map((gh) => (
                      <option key={gh} value={gh}>
                        {gh}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">Project Name</label>
                  <select
                    value={expenseForm.projectName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, projectName: e.target.value })}
                    className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Project</option>
                    {projectList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">Remarks</label>
                <textarea
                  value={expenseForm.remarks}
                  onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                  placeholder="Add any remarks..."
                  rows={2}
                  className="w-full border border-input bg-background rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <ImageUploadField
                fileInputRef={fileInputRef}
                imagePreview={imagePreview}
                onSelect={handleImageSelect}
                onClear={clearAttachedImage}
                label="Upload Receipt (Optional)"
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 transition text-xs shadow-xs"
                >
                  {loading ? 'Submitting...' : 'Submit Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseForm(EMPTY_EXPENSE_FORM(user?.username || (user as any)?.name))}
                  className="px-4 py-2 border rounded-md text-foreground hover:bg-muted transition text-xs"
                >
                  Reset
                </button>
              </div>
            </form>
          )}
        </div>
      </MacModal>

      {/* Table Section */}
      <div className="bg-card rounded-lg border shadow-xs flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="px-3 py-2 text-center">Action</th>
                <th className="px-3 py-2 text-center">SN</th>
                <th className="px-3 py-2 text-center">Type</th>
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2 text-center">Date</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-center">Mode</th>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Receipt</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-3 py-2 text-center">
                    {entry.type === 'EXPENSE' && entry.status === 'PENDING' ? (
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleApproveExpense(entry)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-semibold transition shadow-xs"
                        >
                          <Check size={11} /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectExpense(entry)}
                          className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 px-2 py-0.5 rounded text-[10px] font-semibold transition"
                        >
                          <XCircle size={11} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center font-medium text-foreground">{entry.sn}</td>
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
                  <td className="px-3 py-2 font-bold text-foreground uppercase tracking-tight">{entry.personName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{entry.projectName || '-'}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{formatDate(entry.date)}</td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      entry.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {entry.type === 'CREDIT' ? '+' : '-'}
                    {formatCurrency(entry.amount)}
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{entry.paymentMode}</td>
                  <td className="px-3 py-2 text-muted-foreground uppercase">{entry.groupHead || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {entry.image ? (
                      <button
                        onClick={() => handleImageView(entry.image)}
                        className="text-primary hover:text-primary/80 transition"
                      >
                        <Eye size={15} className="inline" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground/40">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{entry.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEntries.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {dataLoading ? 'Loading entries...' : 'No entries found.'}
          </div>
        )}

        {/* Footer */}
        <div className="p-2.5 px-3 border-t bg-muted/20 flex flex-col lg:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Page Credit:</span>{' '}
              <span className="font-semibold text-emerald-600">{formatCurrency(pageTotalCredit)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Page Expense:</span>{' '}
              <span className="font-semibold text-rose-600">{formatCurrency(pageTotalExpense)}</span>
            </div>
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

      {/* Image Modal */}
      <MacModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title="Receipt Preview"
        subtitle="Voucher transaction proof document"
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
          alt="Receipt"
          className="w-full max-h-[70vh] object-contain rounded-xl border border-border/60 shadow-sm"
        />
      </MacModal>
    </div>
  );
};

export default AddCase;
