import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { subscriptionsApi } from '../../services/document.api';
import { formatDate } from '../../utils/dateFormatter';
import AddSubscription from './AddSubscription';
import { TablePagination } from '../../components/TablePagination';

export const AllSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
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

  const filteredData = useMemo(() => {
    return subscriptions.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (item.subscriptionName || '').toLowerCase().includes(q) ||
        (item.companyName || '').toLowerCase().includes(q) ||
        (item.subscriberName || '').toLowerCase().includes(q) ||
        (item.sn || '').toLowerCase().includes(q);

      const matchesfreq = filterFrequency ? item.frequency === filterFrequency : true;
      return matchesSearch && matchesfreq;
    });
  }, [subscriptions, searchTerm, filterFrequency]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterFrequency]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div>
          <h1 className="text-sm font-bold text-foreground">All Subscriptions</h1>
          <p className="text-xs text-muted-foreground">Track software, services, and cloud recurring costs</p>
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

          <select
            value={filterFrequency}
            onChange={(e) => setFilterFrequency(e.target.value)}
            className="border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
          >
            <option value="">All Frequencies</option>
            {Array.from(new Set(subscriptions.map((s) => s.frequency)))
              .filter(Boolean)
              .sort()
              .map((freq) => (
                <option key={freq} value={freq}>
                  {freq}
                </option>
              ))}
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-1.5 px-3 rounded-md transition text-xs shadow-xs h-8"
          >
            <Plus size={14} /> Add Subscription
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-xs border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 whitespace-nowrap">Serial No</th>
                <th className="px-3 py-2 whitespace-nowrap">Requested Date</th>
                <th className="px-3 py-2 whitespace-nowrap">Company Name</th>
                <th className="px-3 py-2 whitespace-nowrap">Subscriber</th>
                <th className="px-3 py-2 whitespace-nowrap">Subscription</th>
                <th className="px-3 py-2 whitespace-nowrap">Price</th>
                <th className="px-3 py-2 whitespace-nowrap">Frequency</th>
                <th className="px-3 py-2 whitespace-nowrap">Purpose</th>
                <th className="px-3 py-2 whitespace-nowrap">Start Date</th>
                <th className="px-3 py-2 whitespace-nowrap">End Date</th>
                <th className="px-3 py-2 whitespace-nowrap text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-3 py-2 font-mono text-foreground text-[11px]">{item.sn}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(item.requestedDate)}</td>
                  <td className="px-3 py-2 font-bold uppercase tracking-tight text-foreground">{item.companyName}</td>
                  <td className="px-3 py-2 text-foreground">{item.subscriberName}</td>
                  <td className="px-3 py-2 font-medium text-primary">{item.subscriptionName}</td>
                  <td className="px-3 py-2 font-bold text-foreground">{item.price}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                      {item.frequency}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={item.purpose}>
                    {item.purpose}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(item.startDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(item.endDate)}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : item.status === 'Approved'
                          ? 'bg-blue-500/10 text-blue-600'
                          : item.status === 'Rejected'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {item.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading subscriptions...' : 'No subscriptions found.'}
          </div>
        )}

        {filteredData.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
            itemName="subscriptions"
          />
        )}
      </div>

      <AddSubscription isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSaved={loadData} />
    </div>
  );
};

export default AllSubscriptions;
