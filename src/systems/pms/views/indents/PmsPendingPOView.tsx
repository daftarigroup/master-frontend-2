// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmsApi } from '../../services/pmsApi';
import {
  FileText,
  Clock,
  Search,
  Building2,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';

export default function PmsPendingPOView() {
  const navigate = useNavigate();
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await pmsApi.get('/indents?status=ManagementApproved&po_required=true');
      const list = Array.isArray(res) ? res : res?.data || [];
      const flattened: any[] = [];
      list.forEach((ind: any) => {
        // Exclude indents that already have a PO number assigned
        if (ind.po_number && String(ind.po_number).trim() !== '') return;

        if (Array.isArray(ind.items) && ind.items.length > 0) {
          ind.items.forEach((it: any, idx: number) => {
            if (it.po_number && String(it.po_number).trim() !== '') return;
            const vendor = it.selected_vendor || ind.selected_vendor || {};
            flattened.push({
              ...ind,
              item_id: it.id || idx,
              product_name: it.product_name,
              quantity: it.quantity,
              uom: it.uom,
              expected_date: it.expected_date,
              vendor_name: vendor.vendor_name || it.approved_vendor_name || ind.approved_vendor_name || '-',
              approved_rate: it.approved_rate || ind.approved_rate || vendor.rate || 0,
              payment_terms: vendor.payment_terms || it.payment_terms || ind.payment_terms || '30 Days Net',
              delivery_days: vendor.delivery_days || it.delivery_days || ind.delivery_days || 7,
            });
          });
        } else {
          const vendor = ind.selected_vendor || {};
          flattened.push({
            ...ind,
            vendor_name: vendor.vendor_name || ind.approved_vendor_name || '-',
            approved_rate: ind.approved_rate || vendor.rate || 0,
            payment_terms: vendor.payment_terms || ind.payment_terms || '30 Days Net',
            delivery_days: vendor.delivery_days || ind.delivery_days || 7,
          });
        }
      });
      setDataList(flattened);
    } catch (err) {
      console.error('Failed to load pending POs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = dataList.filter((row) => {
    const q = searchQuery.toLowerCase();
    const indNo = String(row.indent_number || row.indentNo || '').toLowerCase();
    const proj = String(row.project_name || row.projectName || '').toLowerCase();
    const prod = String(row.product_name || row.product || '').toLowerCase();
    const vendor = String(row.vendor_name || '').toLowerCase();
    return indNo.includes(q) || proj.includes(q) || prod.includes(q) || vendor.includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">
              Purchase Order Backlog Queue
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              View-only pipeline of items awaiting official PO contract creation
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search indent, project, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-9 px-3 text-xs bg-white gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700">Indent No.</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Date</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Project</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Product / Item</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Vendor Name</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">Approved Rate</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Payment Terms</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Expected Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-36 text-center text-xs text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        Loading pending PO queue...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-36 text-center text-xs text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <AlertCircle className="w-6 h-6 text-slate-400" />
                        <span className="font-semibold text-slate-700">No pending POs to create</span>
                        <span className="text-slate-400 text-xs">
                          When indents receive management rate sanction, they will appear here ready for PO generation.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, idx) => {
                    const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                    const appRate = row.approved_rate ? `₹${Number(row.approved_rate).toLocaleString('en-IN')}` : '-';

                    return (
                      <TableRow
                        key={`${row.id}-${row.item_id || idx}`}
                        onClick={() =>
                          navigate('/pms/indents/create-po', {
                            state: { indentId: row.id, itemId: row.item_id },
                          })
                        }
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <TableCell className="font-semibold text-xs text-blue-700 whitespace-nowrap">
                          {indentNo}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(row.indent_date || row.date || row.created_at)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-800 whitespace-nowrap">
                          {row.project_name || row.projectName || '-'}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-900 max-w-[200px] truncate" title={row.product_name}>
                          {row.product_name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity ?? '-'}</TableCell>
                        <TableCell className="text-xs text-slate-600">{row.uom || '-'}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800">{row.vendor_name || '-'}</TableCell>
                        <TableCell className="text-xs text-right font-bold text-emerald-700 whitespace-nowrap">{appRate}</TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">{row.payment_terms || '-'}</TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(row.expected_date)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
