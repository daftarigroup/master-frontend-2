import React, { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { documentsApi } from '../../services/document.api';
import { formatDateTime } from '../../utils/dateFormatter';
import { TablePagination } from '../../components/TablePagination';

export const SharedDocuments: React.FC = () => {
  const [shareHistory, setShareHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setLoading(true);
    documentsApi
      .listShares()
      .then((res: any) => setShareHistory(Array.isArray(res) ? res : res?.data || []))
      .catch((err: any) => toast.error(err.message || 'Failed to load share history'))
      .finally(() => setLoading(false));
  }, []);

  const filteredData = useMemo(() => {
    return shareHistory.filter(
      (item) =>
        (item.shareNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.docName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.recipientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.docSerial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.contactInfo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shareHistory, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div>
          <h1 className="text-sm font-bold text-foreground">Document Share History</h1>
          <p className="text-xs text-muted-foreground">Track all documents distributed via Email</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
          <input
            type="text"
            placeholder="Search by share no, recipient, serial..."
            className="pl-8 pr-3 py-1.5 w-full border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary h-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-xs border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-3 whitespace-nowrap">Share No.</th>
                <th className="p-3 whitespace-nowrap">Date &amp; Time</th>
                <th className="p-3 whitespace-nowrap">Serial No.</th>
                <th className="p-3 whitespace-nowrap">Document Name</th>
                <th className="p-3 whitespace-nowrap">Shared Via</th>
                <th className="p-3 whitespace-nowrap">Recipient Name</th>
                <th className="p-3 whitespace-nowrap">Contact Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                  <td className="p-3 font-semibold text-primary">{item.shareNo}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDateTime(item.dateTime)}</td>
                  <td className="p-3 text-foreground font-mono text-[11px]">{item.docSerial}</td>
                  <td className="p-3 text-foreground">
                    <div className="flex items-center gap-1.5">
                      <FileText size={14} className="text-muted-foreground" />
                      <span className="truncate max-w-[200px]" title={item.docName}>
                        {item.docName}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {item.sharedVia === 'Email' ? (
                        <Mail size={13} className="text-blue-500" />
                      ) : (
                        <MessageCircle size={13} className="text-emerald-500" />
                      )}
                      <span>{item.sharedVia}</span>
                    </div>
                  </td>
                  <td className="p-3 text-foreground font-bold uppercase tracking-tight">{item.recipientName}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{item.contactInfo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading share history...' : 'No share records found.'}
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
            itemName="share logs"
          />
        )}
      </div>
    </div>
  );
};

export default SharedDocuments;
