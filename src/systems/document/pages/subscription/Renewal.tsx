import React, { useState, useEffect } from 'react';
import { subscriptionsApi } from '../../services/document.api';
import { RotateCcw, X, Check, Save, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/dateFormatter';
import { MacModal } from '@/components/ui/mac-modal';
import { TablePagination } from '../../components/TablePagination';

export const SubscriptionRenewal: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionRenewalHistory, setSubscriptionRenewalHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadData = () => {
    setLoading(true);
    Promise.all([subscriptionsApi.list(), subscriptionsApi.listRenewals()])
      .then(([subsRes, renewalsRes]: any) => {
        setSubscriptions(Array.isArray(subsRes) ? subsRes : subsRes?.data || []);
        setSubscriptionRenewalHistory(Array.isArray(renewalsRes) ? renewalsRes : renewalsRes?.data || []);
      })
      .catch((err: any) => toast.error(err.message || 'Failed to load renewal data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPendingPage(1);
    setHistoryPage(1);
  }, [searchTerm, activeTab]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [renewalAction, setRenewalAction] = useState<'Approved' | 'Rejected' | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const pendingSubscriptions = subscriptions
    .filter((sub) => {
      if (sub.status !== 'Paid') return false;
      if (!sub.endDate) return false;

      const endDate = new Date(sub.endDate);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + 30);
      return endDate <= threshold;
    })
    .filter((sub) => {
      const q = searchTerm.toLowerCase();
      return (
        (sub.companyName || '').toLowerCase().includes(q) ||
        (sub.subscriptionName || '').toLowerCase().includes(q) ||
        (sub.sn || '').toLowerCase().includes(q)
      );
    });

  const filteredHistory = subscriptionRenewalHistory.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      (item.companyName || '').toLowerCase().includes(q) ||
      (item.subscriptionName || '').toLowerCase().includes(q) ||
      (item.sn || '').toLowerCase().includes(q)
    );
  });

  const totalPendingPages = Math.ceil(pendingSubscriptions.length / pageSize) || 1;
  const paginatedPending = pendingSubscriptions.slice((pendingPage - 1) * pageSize, pendingPage * pageSize);

  const totalHistoryPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * pageSize, historyPage * pageSize);

  const handleAction = (sub: any) => {
    setSelectedSub(sub);
    setRenewalAction('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSub(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !renewalAction) {
      toast.error('Please select an action');
      return;
    }

    setSubmitting(true);
    try {
      if (renewalAction === 'Approved') {
        const date = new Date(selectedSub.endDate);
        const freq = (selectedSub.frequency || '').toLowerCase();

        if (freq.includes('year') || freq === 'annual') {
          date.setFullYear(date.getFullYear() + 1);
        } else if (freq.includes('quarter')) {
          date.setMonth(date.getMonth() + 3);
        } else if (freq.includes('month')) {
          const m = freq.includes('6') || freq.includes('half') ? 6 : 1;
          date.setMonth(date.getMonth() + m);
        } else {
          date.setFullYear(date.getFullYear() + 1);
        }

        const newDateStr = date.toISOString().split('T')[0];
        await subscriptionsApi.recordRenewal(selectedSub.id, { endDate: newDateStr });
        toast.success(`Subscription Renewed! New End Date: ${formatDate(newDateStr)}`);
      } else {
        await subscriptionsApi.update(selectedSub.id, { status: 'Rejected' });
        toast.success('Subscription Renewal Rejected');
      }

      handleCloseModal();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process renewal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div>
          <h1 className="text-sm font-bold text-foreground">Subscription Renewals</h1>
          <p className="text-xs text-muted-foreground">Manage recurring contract extensions and expiry dates</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search subscriptions..."
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
              History ({filteredHistory.length})
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
                {activeTab === 'pending' ? (
                  <>
                    <th className="p-3 text-center w-20">Action</th>
                    <th className="p-3">Subscription No</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Subscriber</th>
                    <th className="p-3">Subscription</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">End Date</th>
                  </>
                ) : (
                  <>
                    <th className="p-3">Renewal No</th>
                    <th className="p-3">Subscription No</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Subscriber</th>
                    <th className="p-3">Subscription</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3 text-center">Renewal Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeTab === 'pending'
                ? paginatedPending.map((sub) => (
                    <tr key={sub.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleAction(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition shadow-xs"
                        >
                          <RotateCcw size={12} /> Extend
                        </button>
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground text-[11px]">{sub.sn}</td>
                      <td className="p-3 font-bold uppercase tracking-tight text-foreground">{sub.companyName}</td>
                      <td className="p-3 text-foreground">{sub.subscriberName}</td>
                      <td className="p-3 font-medium text-primary">{sub.subscriptionName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                          {sub.frequency}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-foreground">{sub.price}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[10px] font-bold">
                          {formatDate(sub.endDate)}
                        </span>
                      </td>
                    </tr>
                  ))
                : paginatedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary text-[11px]">{item.renewalNo}</td>
                      <td className="p-3 font-mono text-foreground text-[11px]">{item.sn}</td>
                      <td className="p-3 font-bold uppercase tracking-tight text-foreground">{item.companyName}</td>
                      <td className="p-3 text-foreground">{item.subscriberName}</td>
                      <td className="p-3 font-medium text-primary">{item.subscriptionName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                          {item.frequency}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-foreground">{item.price}</td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.endDate)}</td>
                      <td className="p-3 text-center">
                        {item.renewalStatus === 'Approved' || item.renewalStatus === 'Yes' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Check size={10} /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded text-[10px] font-medium">
                            <X size={10} /> Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {((activeTab === 'pending' && pendingSubscriptions.length === 0) ||
          (activeTab === 'history' && filteredHistory.length === 0)) && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading...' : `No ${activeTab} subscriptions found.`}
          </div>
        )}

        {((activeTab === 'pending' && pendingSubscriptions.length > 0) ||
          (activeTab === 'history' && filteredHistory.length > 0)) && (
          <TablePagination
            currentPage={activeTab === 'pending' ? pendingPage : historyPage}
            totalPages={activeTab === 'pending' ? totalPendingPages : totalHistoryPages}
            totalItems={activeTab === 'pending' ? pendingSubscriptions.length : filteredHistory.length}
            pageSize={pageSize}
            onPageChange={activeTab === 'pending' ? setPendingPage : setHistoryPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPendingPage(1);
              setHistoryPage(1);
            }}
            itemName={`${activeTab} subscriptions`}
          />
        )}
      </div>

      {/* Action Popup Modal */}
      <MacModal
        isOpen={isModalOpen && Boolean(selectedSub)}
        onClose={handleCloseModal}
        title="Process Subscription Renewal"
        subtitle="Authorize extension or termination"
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
              type="submit"
              form="renewal-sub-form"
              disabled={submitting}
              className="flex-1 py-2 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Decision'}
            </button>
          </div>
        }
      >
        {selectedSub && (
          <form id="renewal-sub-form" onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Subscription No</span>
                <p className="font-mono font-medium text-foreground mt-0.5">{selectedSub.sn}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Company</span>
                <p className="font-bold uppercase tracking-tight text-foreground mt-0.5">{selectedSub.companyName}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Subscription</span>
                <p className="font-medium text-primary mt-0.5">{selectedSub.subscriptionName}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Frequency</span>
                <p className="text-foreground mt-0.5">{selectedSub.frequency}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Price</span>
                <p className="font-bold text-foreground mt-0.5">{selectedSub.price}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-border/60">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Current End Date</span>
                <p className="text-amber-600 font-bold mt-0.5">{formatDate(selectedSub.endDate)}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Renewal Decision</label>
              <select
                value={renewalAction}
                onChange={(e) => setRenewalAction(e.target.value as 'Approved' | 'Rejected')}
                className="w-full p-2.5 border border-input rounded-xl bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                required
              >
                <option value="" disabled>
                  Select Action
                </option>
                <option value="Approved">Approve Extension (+1 Period)</option>
                <option value="Rejected">Reject Renewal</option>
              </select>
            </div>
          </form>
        )}
      </MacModal>
    </div>
  );
};

export default SubscriptionRenewal;
