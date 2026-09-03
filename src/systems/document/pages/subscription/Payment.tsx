import React, { useState, useMemo, useEffect } from 'react';
import { subscriptionsApi } from '../../services/document.api';
import { CreditCard, FileText, Eye, X, Save, Upload, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/dateFormatter';
import { openStoredFile } from '../../utils/filePreview';
import { uploadFile } from '@/lib/fetchers';
import { MacModal } from '@/components/ui/mac-modal';
import { TablePagination } from '../../components/TablePagination';

export const SubscriptionPayment: React.FC = () => {
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState<string>('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (startDate && selectedSub && selectedSub.frequency) {
      const start = new Date(startDate);
      const end = new Date(start);
      const freq = (selectedSub.frequency || '').toLowerCase();

      if (freq.includes('month')) {
        const months = freq.includes('6') || freq.includes('half') ? 6 : 1;
        end.setMonth(end.getMonth() + months);
      } else if (freq.includes('quarter')) {
        end.setMonth(end.getMonth() + 3);
      } else if (freq.includes('year') || freq === 'annual') {
        end.setFullYear(end.getFullYear() + 1);
      }

      end.setDate(end.getDate() - 1);
      if (!isNaN(end.getTime())) {
        setEndDate(end.toISOString().split('T')[0]);
      }
    }
  }, [startDate, selectedSub]);

  const pendingSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (s) =>
          s.status === 'Approved' &&
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
          s.status === 'Paid' &&
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

  const handlePayClick = (sub: any) => {
    setSelectedSub(sub);
    setStartDate(sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '');
    setEndDate(sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '');
    setPaymentMethod('Credit Card');
    setFileName('');
    setFileContent('');
  };

  const handleCloseModal = () => {
    setSelectedSub(null);
    setFileName('');
    setFileContent('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    setFileName(file.name);
    setIsUploadingFile(true);
    try {
      // Store the S3 URL rather than inlining the file's bytes as base64.
      const url = await uploadFile({ file, folderId: 'document', subFolder: 'subscription-payments' });
      setFileContent(url);
    } catch (error) {
      console.error('Payment receipt upload error:', error);
      setFileName('');
      setFileContent('');
      toast.error('Failed to upload receipt. Please try again.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSub) return;
    if (!startDate || !endDate) {
      toast.error('Please select Start and End dates');
      return;
    }

    setSubmitting(true);
    try {
      await subscriptionsApi.update(selectedSub.id, { startDate, endDate });
      await subscriptionsApi.pay(selectedSub.id, {
        paymentMethod,
        paymentFile: fileName || undefined,
        paymentFileContent: fileContent || undefined,
      });

      toast.success('Payment recorded successfully');
      handleCloseModal();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = async (content: string | undefined, name: string | undefined, subId?: string) => {
    try {
      if (content) {
        openStoredFile(content, name);
        return;
      }
      if (subId) {
        const toastId = toast.loading('Loading receipt file...');
        try {
          const fullSub: any = await subscriptionsApi.getOne(subId);
          const data = fullSub?.data || fullSub;
          toast.dismiss(toastId);
          if (data?.paymentFileContent) {
            openStoredFile(data.paymentFileContent, data.paymentFile || name);
          } else {
            toast.error('Receipt file is not available for preview.');
          }
        } catch (e: any) {
          toast.dismiss(toastId);
          toast.error(e.message || 'Failed to load receipt file.');
        }
        return;
      }
      openStoredFile(content, name);
    } catch (err: any) {
      toast.error(err.message || 'Payment file not available for preview.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div>
          <h1 className="text-sm font-bold text-foreground">Subscription Payments</h1>
          <p className="text-xs text-muted-foreground">Manage payment processing and receipt attachments</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search payments..."
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
                {activeTab === 'history' && <th className="p-3">Payment Date</th>}
                {activeTab === 'pending' && <th className="p-3 text-center">Action</th>}
                <th className="p-3">Subscription No</th>
                <th className="p-3">Company</th>
                <th className="p-3">Subscriber</th>
                <th className="p-3">Subscription</th>
                <th className="p-3">Price</th>
                <th className="p-3">Frequency</th>
                <th className="p-3">Approved On</th>
                {activeTab === 'history' && (
                  <>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Receipt File</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(activeTab === 'pending' ? paginatedPending : paginatedHistory).map((item) => (
                <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                  {activeTab === 'history' && (
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.paymentDate)}</td>
                  )}
                  {activeTab === 'pending' && (
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handlePayClick(item)}
                        className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 shadow-xs transition flex items-center gap-1 mx-auto"
                      >
                        <CreditCard size={12} /> Pay
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
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.approvalDate)}</td>
                  {activeTab === 'history' && (
                    <>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.startDate)}</td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(item.endDate)}</td>
                      <td className="p-3 text-foreground font-medium">{item.paymentMethod}</td>
                      <td className="p-3">
                        {item.paymentFile ? (
                          <button
                            onClick={() => handlePreview(item.paymentFileContent, item.paymentFile, item.id)}
                            className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium hover:underline text-xs"
                            title="Preview receipt in new tab"
                          >
                            <Eye size={13} /> View
                          </button>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(activeTab === 'pending' ? pendingSubscriptions : historySubscriptions).length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading...' : `No ${activeTab} payments found.`}
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
            itemName={`${activeTab} payments`}
          />
        )}
      </div>

      {/* Payment Modal */}
      <MacModal
        isOpen={Boolean(selectedSub)}
        onClose={handleCloseModal}
        title="Record Subscription Payment"
        subtitle="Attach payment receipt and set billing term"
        maxWidth="lg"
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
              className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex justify-center items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} /> {submitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        }
      >
        {selectedSub && (
          <div className="space-y-4">
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
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Price</span>
                <p className="font-bold text-foreground mt-0.5">{selectedSub.price}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Frequency</span>
                <p className="text-foreground mt-0.5">{selectedSub.frequency}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 border border-input rounded-xl bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 border border-input rounded-xl bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Payment Method</label>
                <select
                  className="w-full p-2.5 border border-input rounded-xl bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Upload Receipt</label>
                <input type="file" id="pay-file" className="hidden" onChange={handleFileChange} />
                <label
                  htmlFor="pay-file"
                  className="flex items-center justify-center gap-1.5 w-full p-2.5 border border-dashed border-input rounded-xl text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground transition bg-background"
                >
                  <Upload size={13} />
                  <span className="text-xs truncate max-w-[140px]">{fileName || 'Choose File...'}</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </MacModal>
    </div>
  );
};

export default SubscriptionPayment;
