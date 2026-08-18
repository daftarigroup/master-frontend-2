import React, { useState, useMemo, useEffect } from 'react';
import { subscriptionsApi } from '../../services/document.api';
import { CheckCircle, X, Save, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/dateFormatter';
import { MacModal } from '@/components/ui/mac-modal';
import { TablePagination } from '../../components/TablePagination';

export const SubscriptionApproval: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadData = () => {
    setLoading(true);
    subscriptionsApi
      .list()
      .then((res: any) => setSubscriptions(Array.isArray(res) ? res : res?.data || []))
      .catch((err: any) => toast.error(err.message || 'Failed to load subscriptions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPendingPage(1);
    setHistoryPage(1);
  }, [searchTerm, activeTab]);

  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'Approve' | 'Reject'>('Approve');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pendingSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (s) =>
          (!s.status || s.status === 'Pending') &&
          ((s.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.subscriptionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.sn || '').toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [subscriptions, searchTerm]
  );

  const historySubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (s) =>
          (s.status === 'Approved' || s.status === 'Rejected' || s.status === 'Paid') &&
          ((s.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.subscriptionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.sn || '').toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [subscriptions, searchTerm]
  );

  const totalPendingPages = Math.ceil(pendingSubscriptions.length / pageSize) || 1;
  const paginatedPending = pendingSubscriptions.slice((pendingPage - 1) * pageSize, pendingPage * pageSize);

  const totalHistoryPages = Math.ceil(historySubscriptions.length / pageSize) || 1;
  const paginatedHistory = historySubscriptions.slice((historyPage - 1) * pageSize, historyPage * pageSize);

  const handleActionClick = (sub: any) => {
    setSelectedSub(sub);
    setApprovalStatus('Approve');
    setRemarks('');
  };

  const handleCloseModal = () => {
    setSelectedSub(null);
  };

  const handleSave = async () => {
    if (!selectedSub) return;

    const approvedCount = subscriptions.filter((s) => s.approvalNo).length;
    const nextNum = approvedCount + 1;
    const apNo = `AP-${nextNum.toString().padStart(3, '0')}`;
    const newStatus = approvalStatus === 'Approve' ? 'Approved' : 'Rejected';

    setSubmitting(true);
    try {
      await subscriptionsApi.approve(selectedSub.id, {
        status: newStatus,
        approvalNo: apNo,
        remarks: remarks,
      });

      toast.success(`Subscription ${newStatus}`);
      handleCloseModal();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process approval');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div>
          <h1 className="text-sm font-bold text-foreground">Subscription Approval</h1>
          <p className="text-xs text-muted-foreground">Review and authorize recurring software or vendor subscriptions</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search..."
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
              Pending ({pendingSubscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeTab === 'history'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              History ({historySubscriptions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-xs border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              <tr>
                {activeTab === 'history' && <th className="p-3">Approval No</th>}
                {activeTab === 'pending' && <th className="p-3 text-center">Action</th>}
                <th className="p-3">Serial No</th>
                <th className="p-3">Company</th>
                <th className="p-3">Subscriber</th>
                <th className="p-3">Subscription</th>
                <th className="p-3">Price</th>
                <th className="p-3">Frequency</th>
                <th className="p-3">Requested On</th>
                {activeTab === 'history' && <th className="p-3">Approval Date</th>}
                {activeTab === 'history' && <th className="p-3 text-center">Status</th>}
                {activeTab === 'history' && <th className="p-3">Remarks</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(activeTab === 'pending' ? paginatedPending : paginatedHistory).map((item) => (
                <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                  {activeTab === 'history' && (
                    <td className="p-3 font-mono font-bold text-foreground text-[11px]">{item.approvalNo || '-'}</td>
                  )}
                  {activeTab === 'pending' && (
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleActionClick(item)}
                        className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 shadow-xs transition"
                      >
                        Approve / Reject
                      </button>
                    </td>
                  )}
                  <td className="p-3 font-mono font-bold text-foreground text-[11px]">{item.sn}</td>
                  <td className="p-3 font-bold uppercase tracking-tight text-foreground">{item.companyName}</td>
                  <td className="p-3 text-foreground">{item.subscriberName}</td>
                  <td className="p-3 font-medium text-primary">{item.subscriptionName}</td>
                  <td className="p-3 font-bold text-foreground">{item.price}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                      {item.frequency}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.requestedDate)}</td>
                  {activeTab === 'history' && (
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.approvalDate)}</td>
                  )}
                  {activeTab === 'history' && (
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Rejected'
                            ? 'bg-destructive/10 text-destructive'
                            : item.status === 'Paid'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}
                      >
                        {item.status === 'Paid' ? 'Approved (Paid)' : item.status}
                      </span>
                    </td>
                  )}
                  {activeTab === 'history' && (
                    <td className="p-3 text-muted-foreground max-w-xs truncate" title={item.remarks}>
                      {item.remarks || '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(activeTab === 'pending' ? pendingSubscriptions : historySubscriptions).length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading...' : `No ${activeTab} subscriptions found.`}
          </div>
        )}

        {(activeTab === 'pending' ? pendingSubscriptions : historySubscriptions).length > 0 && (
          <TablePagination
            currentPage={activeTab === 'pending' ? pendingPage : historyPage}
            totalPages={activeTab === 'pending' ? totalPendingPages : totalHistoryPages}
            totalItems={activeTab === 'pending' ? pendingSubscriptions.length : historySubscriptions.length}
            pageSize={pageSize}
            onPageChange={activeTab === 'pending' ? setPendingPage : setHistoryPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPendingPage(1);
              setHistoryPage(1);
            }}
            itemName={`${activeTab} approvals`}
          />
        )}
      </div>

      {/* Approval Modal */}
      <MacModal
        isOpen={Boolean(selectedSub)}
        onClose={handleCloseModal}
        title="Review Subscription"
        subtitle="Authorization and status approval decision"
        maxWidth="md"
        bodyClassName="p-6 space-y-4"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-2 px-4 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className={`flex-1 py-2 px-4 rounded-xl text-white text-xs font-bold shadow-sm transition flex justify-center items-center gap-1.5 disabled:opacity-50 ${
                approvalStatus === 'Approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-destructive hover:bg-destructive/90'
              }`}
            >
              <Save size={14} /> {submitting ? 'Saving...' : approvalStatus === 'Approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        }
      >
        {selectedSub && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Serial No</span>
                <p className="font-mono font-medium text-foreground mt-0.5">{selectedSub.sn}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Requested On</span>
                <p className="text-foreground mt-0.5">{formatDate(selectedSub.requestedDate)}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Company</span>
                <p className="font-bold uppercase tracking-tight text-foreground mt-0.5">{selectedSub.companyName}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Subscriber</span>
                <p className="text-foreground mt-0.5">{selectedSub.subscriberName}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Subscription</span>
                <p className="font-medium text-primary mt-0.5">{selectedSub.subscriptionName}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Price</span>
                <p className="font-bold text-foreground mt-0.5">{selectedSub.price}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Frequency</span>
                <p className="text-foreground mt-0.5">{selectedSub.frequency}</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Decision</label>
                <select
                  className="w-full p-2.5 border border-input rounded-xl bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as 'Approve' | 'Reject')}
                >
                  <option value="Approve">Approve Subscription</option>
                  <option value="Reject">Reject Subscription</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Remarks</label>
                <input
                  type="text"
                  className="w-full p-2.5 border border-input rounded-xl bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                  placeholder="Enter approval comments..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </MacModal>
    </div>
  );
};

export default SubscriptionApproval;
