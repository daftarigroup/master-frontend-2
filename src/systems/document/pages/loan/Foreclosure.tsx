import React, { useState, useEffect } from 'react';
import { Search, Building, Calendar, User, X } from 'lucide-react';
import { loansApi } from '../../services/document.api';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/dateFormatter';
import { MacModal } from '@/components/ui/mac-modal';
import { TablePagination } from '../../components/TablePagination';

export const Foreclosure: React.FC = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [formData, setFormData] = useState({
    requestDate: new Date().toISOString().split('T')[0],
    requesterName: 'Admin',
  });

  const loadData = () => {
    setLoading(true);
    loansApi
      .list()
      .then((res: any) => setLoans(Array.isArray(res) ? res : res?.data || []))
      .catch((err: any) => toast.error(err.message || 'Failed to load loans'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPendingPage(1);
    setHistoryPage(1);
  }, [searchTerm, activeTab]);

  const pendingLoans = loans.filter(
    (loan) =>
      !loan.foreclosureStatus &&
      ((loan.bankName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loan.loanName || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const historyLoans = loans.filter(
    (loan) =>
      loan.foreclosureStatus &&
      ((loan.bankName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loan.loanName || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPendingPages = Math.ceil(pendingLoans.length / pageSize) || 1;
  const paginatedPending = pendingLoans.slice((pendingPage - 1) * pageSize, pendingPage * pageSize);

  const totalHistoryPages = Math.ceil(historyLoans.length / pageSize) || 1;
  const paginatedHistory = historyLoans.slice((historyPage - 1) * pageSize, historyPage * pageSize);

  const handleActionClick = (loan: any) => {
    setSelectedLoan(loan);
    setFormData({
      requestDate: loan.requestDate
        ? String(loan.requestDate).split('T')[0]
        : new Date().toISOString().split('T')[0],
      requesterName: loan.requesterName || 'Admin',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setSubmitting(true);
    try {
      await loansApi.foreclosureRequest(selectedLoan.id, {
        requesterName: formData.requesterName,
      });
      await loansApi.collectDocuments(selectedLoan.id, { documentCollectionRemarks: '' });

      toast.success('Foreclosure requested successfully');
      setIsModalOpen(false);
      setSelectedLoan(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request foreclosure');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div>
          <h1 className="text-sm font-bold text-foreground">Requested Loan Foreclosure</h1>
          <p className="text-xs text-muted-foreground">Submit and track bank loan premature foreclosure closures</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search loans..."
              className="pl-8 pr-3 py-1.5 w-full border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary h-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-muted p-0.5 rounded-md">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeTab === 'pending'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending ({pendingLoans.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeTab === 'history'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              History ({historyLoans.length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-xs border overflow-hidden">
        {activeTab === 'pending' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                <tr>
                  <th className="p-3 text-center">Action</th>
                  <th className="p-3">Serial No.</th>
                  <th className="p-3">Loan Name</th>
                  <th className="p-3">Bank Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">EMI</th>
                  <th className="p-3">Loan Start Date</th>
                  <th className="p-3">Loan End Date</th>
                  <th className="p-3">Provided Document</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedPending.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleActionClick(item)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-md shadow-xs transition"
                      >
                        Request Foreclosure
                      </button>
                    </td>
                    <td className="p-3 font-mono font-bold text-foreground text-[11px]">{item.sn}</td>
                    <td className="p-3 font-medium text-foreground">{item.loanName}</td>
                    <td className="p-3 text-primary font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Building size={13} className="text-muted-foreground" />
                        <span>{item.bankName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-foreground">{item.amount}</td>
                    <td className="p-3 text-foreground font-medium">{item.emi}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.startDate)}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.endDate)}</td>
                    <td className="p-3 text-muted-foreground">{item.providedDocument}</td>
                    <td className="p-3 text-muted-foreground italic max-w-xs truncate">{item.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                <tr>
                  <th className="p-3">Serial No.</th>
                  <th className="p-3">Loan Name</th>
                  <th className="p-3">Bank Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">EMI</th>
                  <th className="p-3">Loan Start Date</th>
                  <th className="p-3">Loan End Date</th>
                  <th className="p-3">Request Date</th>
                  <th className="p-3">Requester Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-foreground text-[11px]">{item.sn}</td>
                    <td className="p-3 font-medium text-foreground">{item.loanName}</td>
                    <td className="p-3 text-primary font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Building size={13} className="text-muted-foreground" />
                        <span>{item.bankName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-foreground">{item.amount}</td>
                    <td className="p-3 text-foreground font-medium">{item.emi}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.startDate)}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.endDate)}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-muted-foreground" />
                        <span>{formatDate(item.requestDate)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-muted-foreground" />
                        <span>{item.requesterName || '-'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {((activeTab === 'pending' && pendingLoans.length === 0) ||
          (activeTab === 'history' && historyLoans.length === 0)) && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading...' : `No ${activeTab} foreclosure records found.`}
          </div>
        )}

        {((activeTab === 'pending' && pendingLoans.length > 0) ||
          (activeTab === 'history' && historyLoans.length > 0)) && (
          <TablePagination
            currentPage={activeTab === 'pending' ? pendingPage : historyPage}
            totalPages={activeTab === 'pending' ? totalPendingPages : totalHistoryPages}
            totalItems={activeTab === 'pending' ? pendingLoans.length : historyLoans.length}
            pageSize={pageSize}
            onPageChange={activeTab === 'pending' ? setPendingPage : setHistoryPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPendingPage(1);
              setHistoryPage(1);
            }}
            itemName={`${activeTab} foreclosure records`}
          />
        )}
      </div>

      {/* Action Modal */}
      <MacModal
        isOpen={isModalOpen && Boolean(selectedLoan)}
        onClose={() => setIsModalOpen(false)}
        title="Request Loan Foreclosure"
        subtitle="Submit premature facility closure request"
        maxWidth="md"
        bodyClassName="p-6 space-y-4"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2 px-4 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="foreclosure-form"
              disabled={submitting}
              className="flex-1 py-2 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        }
      >
        {selectedLoan && (
          <form id="foreclosure-form" onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Serial No.</span>
                <p className="font-mono text-foreground font-medium mt-0.5">{selectedLoan.sn}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Loan Name</span>
                <p className="text-foreground font-medium mt-0.5">{selectedLoan.loanName}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Bank Name</span>
                <p className="text-primary font-bold mt-0.5">{selectedLoan.bankName}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Amount</span>
                <p className="font-bold text-foreground mt-0.5">{selectedLoan.amount}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Foreclosure Request Date</label>
              <input
                type="date"
                required
                className="w-full p-2.5 border border-input rounded-xl bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                value={formData.requestDate}
                onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Requester Name</label>
              <input
                type="text"
                required
                className="w-full p-2.5 border border-input rounded-xl bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                value={formData.requesterName}
                onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
              />
            </div>
          </form>
        )}
      </MacModal>
    </div>
  );
};

export default Foreclosure;
