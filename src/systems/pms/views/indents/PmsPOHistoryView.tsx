// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { pmsApi } from '../../services/pmsApi';
import {
  FileText,
  Clock,
  Search,
  Building2,
  RefreshCw,
  Eye,
  Receipt,
  Printer,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';

export default function PmsPOHistoryView() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected PO for View Dialog
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await pmsApi.get('/pos');
      const list = Array.isArray(res) ? res : res?.data || [];
      const flattened: any[] = [];

      list.forEach((po: any, poIdx: number) => {
        const poNo = po.po_number || po.poNumber || `PO-PMS-${String(po.id || poIdx).padStart(4, '0')}`;
        const poDate = po.po_date || po.timestamp || po.created_at;
        const vendor = po.vendor_name || po.partyName || '-';
        const project = po.project_name || po.projectName || '-';
        const totalAmount = Number(po.grand_total || po.totalPoAmount || po.amount || 0);

        if (Array.isArray(po.line_items) && po.line_items.length > 0) {
          po.line_items.forEach((it: any, itIdx: number) => {
            const qty = Number(it.quantity) || 1;
            const rate = Number(it.rate) || 0;
            const gst = Number(it.gst_percent) || 0;
            const baseAmt = qty * rate;
            const itemTotal = baseAmt + (baseAmt * gst) / 100;

            flattened.push({
              ...po,
              unique_id: `${po.id || poIdx}_${itIdx}`,
              po_number: poNo,
              po_date: poDate,
              vendor_name: vendor,
              project_name: project,
              product_name: it.product_name || po.product || '-',
              description: it.description || it.specifications || po.description || '-',
              quantity: qty,
              uom: it.uom || po.unit || 'Nos',
              rate: rate,
              gst_percent: gst,
              amount: baseAmt,
              item_total: itemTotal,
              total_po_amount: totalAmount || itemTotal,
              status: po.status || 'Issued',
              raw_po: po,
            });
          });
        } else {
          const qty = Number(po.quantity) || 1;
          const rate = Number(po.rate) || 0;
          const gst = Number(po.gst_percent || po.gstPercent) || 0;
          const baseAmt = Number(po.amount) || qty * rate;

          flattened.push({
            ...po,
            unique_id: String(po.id || poIdx),
            po_number: poNo,
            po_date: poDate,
            vendor_name: vendor,
            project_name: project,
            product_name: po.product || po.product_name || '-',
            description: po.description || po.specifications || '-',
            quantity: qty,
            uom: po.unit || po.uom || 'Nos',
            rate: rate,
            gst_percent: gst,
            amount: baseAmt,
            item_total: baseAmt + (baseAmt * gst) / 100,
            total_po_amount: totalAmount || baseAmt,
            status: po.status || 'Issued',
            raw_po: po,
          });
        }
      });

      setDataList(flattened);
    } catch (err) {
      console.error('Failed to load PO master history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetailModal = (row: any) => {
    setSelectedPO(row.raw_po || row);
  };

  const handleCloseModal = () => {
    setSelectedPO(null);
  };

  const filteredData = dataList.filter((row) => {
    const q = searchQuery.toLowerCase();
    const poNo = String(row.po_number || '').toLowerCase();
    const vendor = String(row.vendor_name || '').toLowerCase();
    const proj = String(row.project_name || '').toLowerCase();
    const prod = String(row.product_name || '').toLowerCase();
    const desc = String(row.description || '').toLowerCase();
    const status = String(row.status || '').toLowerCase();

    return (
      poNo.includes(q) ||
      vendor.includes(q) ||
      proj.includes(q) ||
      prod.includes(q) ||
      desc.includes(q) ||
      status.includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">
              PO Master Audit Trail
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Search across all PO numbers, vendors, projects, products, and commercial terms
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search across all fields..."
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
                  <TableHead className="text-xs font-bold text-slate-700">PO No.</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Date</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Vendor / Party</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Project</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Product</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Description</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">Rate (₹)</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">GST %</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">Base Amt (₹)</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">Total PO Amt (₹)</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-36 text-center text-xs text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                        Loading purchase order registry...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-36 text-center text-xs text-slate-500">
                      No purchase orders found matching search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.unique_id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell className="font-semibold text-xs text-indigo-700 whitespace-nowrap">
                        {row.po_number}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(row.po_date)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900 max-w-[160px] truncate" title={row.vendor_name}>
                        {row.vendor_name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 max-w-[150px] truncate" title={row.project_name}>
                        {row.project_name}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900 max-w-[160px] truncate" title={row.product_name}>
                        {row.product_name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[140px] truncate" title={row.description}>
                        {row.description}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity}</TableCell>
                      <TableCell className="text-xs text-slate-600">{row.uom}</TableCell>
                      <TableCell className="text-xs text-right text-slate-800 whitespace-nowrap">
                        ₹{Number(row.rate).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600">{row.gst_percent}%</TableCell>
                      <TableCell className="text-xs text-right text-slate-700 whitespace-nowrap">
                        ₹{Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-emerald-700 whitespace-nowrap">
                        ₹{Number(row.total_po_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                          {row.status || 'Issued'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetailModal(row)}
                          className="h-8 px-2.5 text-xs text-indigo-700 hover:bg-indigo-50 border-indigo-200 gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* PO DETAIL VIEW DIALOG */}
      <Dialog open={!!selectedPO} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-3xl bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex justify-between items-center pr-6">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Purchase Order Details — {selectedPO?.po_number || selectedPO?.poNo}
              </DialogTitle>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                {selectedPO?.status || 'Issued'}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Contract overview, dispatch conditions, line items, and sanctioned payment terms
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-5 pt-2 text-xs">
              {/* Header Grid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-500 font-medium block">PO Number:</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5">{selectedPO.po_number || selectedPO.poNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">PO Date:</span>
                  <span className="font-semibold text-slate-800 mt-0.5">{formatDate(selectedPO.po_date || selectedPO.timestamp)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Associated Indent:</span>
                  <span className="font-semibold text-indigo-700 mt-0.5">{selectedPO.indent_number || selectedPO.indentNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Site Engineer:</span>
                  <span className="font-semibold text-slate-800 mt-0.5">{selectedPO.site_engineer_name || '-'}</span>
                </div>
              </div>

              {/* Vendor & Delivery Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Vendor Details</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedPO.vendor_name || selectedPO.partyName || '-'}</p>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-500">Payment Terms:</span> {selectedPO.payment_terms || '30 Days Net'}
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Project & Consignment</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedPO.project_name || selectedPO.projectName || '-'}</p>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-500">Delivery Address:</span> {selectedPO.delivery_address || 'As per project agreement'}
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-700">Product</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Rate (₹)</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">GST %</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Total (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(selectedPO.line_items) && selectedPO.line_items.length > 0 ? (
                      selectedPO.line_items.map((it: any, i: number) => {
                        const base = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
                        const gst = (base * (Number(it.gst_percent) || 0)) / 100;
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-semibold text-slate-900">{it.product_name}</TableCell>
                            <TableCell className="text-right font-bold">{it.quantity}</TableCell>
                            <TableCell>{it.uom}</TableCell>
                            <TableCell className="text-right">₹{Number(it.rate).toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right">{it.gst_percent}%</TableCell>
                            <TableCell className="text-right font-bold text-emerald-700">
                              ₹{(base + gst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell className="font-semibold text-slate-900">{selectedPO.product_name || selectedPO.product || '-'}</TableCell>
                        <TableCell className="text-right font-bold">{selectedPO.quantity || 1}</TableCell>
                        <TableCell>{selectedPO.uom || selectedPO.unit || 'Nos'}</TableCell>
                        <TableCell className="text-right">₹{Number(selectedPO.rate || 0).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">{selectedPO.gst_percent || selectedPO.gstPercent || 0}%</TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">
                          ₹{Number(selectedPO.grand_total || selectedPO.totalPoAmount || selectedPO.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Financial Calculation Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-end">
                <div className="w-72 space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Sub Total:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{Number(selectedPO.sub_total || selectedPO.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{Number(selectedPO.gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-sm text-indigo-900">
                    <span>Grand Total:</span>
                    <span>
                      ₹{Number(selectedPO.grand_total || selectedPO.totalPoAmount || selectedPO.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              {selectedPO.terms_conditions && (
                <div className="space-y-1">
                  <span className="text-slate-500 font-semibold block">Terms & Conditions:</span>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-line text-[11px]">
                    {selectedPO.terms_conditions}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {selectedPO.remarks && (
                <div className="space-y-1">
                  <span className="text-slate-500 font-semibold block">Remarks:</span>
                  <p className="text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedPO.remarks}
                  </p>
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-slate-100 flex justify-between">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
                <Button size="sm" onClick={handleCloseModal}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
