import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Building, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { loansApi } from '../../services/document.api';
import { formatDate } from '../../utils/dateFormatter';
import { previewFileInNewTab } from '../../utils/filePreview';
import AddLoan from './AddLoan';
import { TablePagination } from '../../components/TablePagination';

export const AllLoans: React.FC = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const filteredData = useMemo(() => {
    return loans.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (item.bankName || '').toLowerCase().includes(q) ||
        (item.loanName || '').toLowerCase().includes(q) ||
        (item.sn || '').toLowerCase().includes(q);

      const matchesBank = filterBank ? item.bankName === filterBank : true;
      return matchesSearch && matchesBank;
    });
  }, [loans, searchTerm, filterBank]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBank]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handlePreview = async (item: any) => {
    try {
      if (item.fileContent) {
        previewFileInNewTab(item.fileContent, item.file);
        return;
      }
      const toastId = toast.loading('Loading loan attachment...');
      try {
        const fullLoan: any = await loansApi.getOne(item.id);
        const data = fullLoan?.data || fullLoan;
        toast.dismiss(toastId);
        if (data?.fileContent) {
          previewFileInNewTab(data.fileContent, data.file || item.file);
        } else {
          toast.error('File attachment is not available for preview.');
        }
      } catch (e: any) {
        toast.dismiss(toastId);
        toast.error(e.message || 'Failed to load file preview.');
      }
    } catch (err: any) {
      toast.error(err.message || 'File attachment not available.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div>
          <h1 className="text-sm font-bold text-foreground">All Loans &amp; Mortgages</h1>
          <p className="text-xs text-muted-foreground">Manage active banking facilities, collaterals and tenure</p>
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

          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
          >
            <option value="">All Banks</option>
            {Array.from(new Set(loans.map((l) => l.bankName)))
              .filter(Boolean)
              .sort()
              .map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-1.5 px-3 rounded-md transition text-xs shadow-xs h-8"
          >
            <Plus size={14} /> Add Loan
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-xs border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              <tr>
                <th className="px-3 py-2">Serial No.</th>
                <th className="px-3 py-2">Loan Name</th>
                <th className="px-3 py-2">Bank Name</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">EMI</th>
                <th className="px-3 py-2">Loan Start Date</th>
                <th className="px-3 py-2">Loan End Date</th>
                <th className="px-3 py-2">Collateral Document</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-3 py-2 font-mono font-bold text-foreground text-[11px]">{item.sn}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{item.loanName}</td>
                  <td className="px-3 py-2 text-primary font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Building size={13} className="text-muted-foreground" />
                      <span>{item.bankName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-bold text-foreground">{item.amount}</td>
                  <td className="px-3 py-2 text-foreground font-medium">{item.emi}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(item.startDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(item.endDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.providedDocument || '-'}</td>
                  <td className="px-3 py-2">
                    {item.file ? (
                      <button
                        onClick={() => handlePreview(item)}
                        className="text-primary hover:text-primary/80 font-medium hover:underline text-xs flex items-center gap-1.5"
                        title="Preview loan document in new tab"
                      >
                        <Eye size={13} /> {item.file}
                      </button>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground italic max-w-xs truncate">{item.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading loan records...' : 'No loans found.'}
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
            itemName="loan records"
          />
        )}
      </div>

      <AddLoan isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSaved={loadData} />
    </div>
  );
};

export default AllLoans;

