// @ts-nocheck
// Technical + Management approval in one step: pick the winning vendor, fix the approved rate, approve or reject.
import React, { useState, useEffect } from 'react';
import { pmsApi } from '../../services/pmsApi';
import { toast } from 'sonner';
import { Clock, Search, CheckCircle2, FileCheck2, RefreshCw, ShieldCheck, Award } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';

const flatten = (list: any[], onlyDecided: boolean | null = null) => {
  const out: any[] = [];
  list.forEach((ind: any) => {
    if (Array.isArray(ind.items) && ind.items.length > 0) {
      ind.items.forEach((it: any, idx: number) => {
        if (onlyDecided === false && it.approval_status) return; // pending list: items without a decision
        if (onlyDecided === true && !it.approval_status) return; // history: items with a decision
        out.push({
          ...ind,
          item_id: it.id || idx,
          product_name: it.product_name,
          quantity: it.quantity,
          uom: it.uom,
          vendors: it.vendors || ind.vendors || [],
          selected_vendor: it.selected_vendor || ind.selected_vendor,
          approved_rate: it.approved_rate ?? ind.approved_rate,
          approval_status: it.approval_status,
          approved_vendor_name: it.approved_vendor_name || ind.approved_vendor_name,
        });
      });
    } else out.push(ind);
  });
  return out;
};

const matches = (row: any, q: string) =>
  [row.indent_number, row.indentNo, row.project_name, row.product_name]
    .map((v) => String(v || '').toLowerCase())
    .some((v) => v.includes(q.toLowerCase()));

export default function PmsApprovalView() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchPending, setSearchPending] = useState('');
  const [searchHistory, setSearchHistory] = useState('');

  const [selectedIndent, setSelectedIndent] = useState<any | null>(null);
  const [vendorIdx, setVendorIdx] = useState<number | null>(null);
  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [approvedRate, setApprovedRate] = useState<number | string>('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async (query: string, set: any, setLoading: any, decided: boolean) => {
    setLoading(true);
    try {
      const res = await pmsApi.get(query);
      set(flatten(Array.isArray(res) ? res : res?.data || [], decided));
    } catch (err) {
      console.error('Failed to load approvals', err);
    } finally {
      setLoading(false);
    }
  };
  const loadPending = () => load('/indents?status=VendorRated', setPendingList, setLoadingPending, false);
  const loadHistory = () => load('/indents?reviewed=management', setHistoryList, setLoadingHistory, true);

  useEffect(() => {
    activeTab === 'history' ? loadHistory() : loadPending();
  }, [activeTab]);

  const handleOpen = (row: any) => {
    setSelectedIndent(row);
    setVendorIdx(0);
    setDecision('Approved');
    setApprovedRate('');
    setRemarks('');
  };
  const handleClose = () => setSelectedIndent(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndent) return;
    const vendors = Array.isArray(selectedIndent.vendors) ? selectedIndent.vendors : [];
    const chosen = vendorIdx !== null ? vendors[vendorIdx] : null;
    if (decision === 'Approved') {
      if (!chosen) return toast.error('Please select a vendor');
      if (!approvedRate || Number(approvedRate) <= 0) return toast.error('Please enter a valid approved rate');
    }
    setSubmitting(true);
    try {
      const id = selectedIndent.id || selectedIndent.indent_id;
      const res = await pmsApi.patch(`/indents/${id}/approval`, {
        decision,
        item_id: selectedIndent.item_id,
        selected_vendor_id: chosen?.id,
        approved_rate: decision === 'Approved' ? Number(approvedRate) : undefined,
        po_required: decision === 'Approved',
        remarks,
      });
      if (res?.error && !res.success) return toast.error(res.error || 'Failed to save approval');
      toast.success(`Indent ${selectedIndent.indent_number || 'PI'} ${decision === 'Approved' ? 'approved' : 'rejected'}`);
      handleClose();
      loadPending();
    } catch (err: any) {
      toast.error(err?.message || 'Error saving approval');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPending = pendingList.filter((r) => matches(r, searchPending));
  const filteredHistory = historyList.filter((r) => matches(r, searchHistory));
  const no = (row: any, idx: number) => row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;

  const searchBox = (value: string, set: any, reload: any, loading: boolean) => (
    <div className="flex items-center gap-3">
      <div className="relative w-64">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <Input placeholder="Search by indent, project, product..." value={value} onChange={(e) => set(e.target.value)} className="pl-9 h-9 text-xs bg-white" />
      </div>
      <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="h-9 px-3 text-xs bg-white gap-1.5">
        <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
      </Button>
    </div>
  );

  const emptyRow = (cols: number, loading: boolean, text: string) => (
    <TableRow>
      <TableCell colSpan={cols} className="h-32 text-center text-xs text-slate-500">
        <div className="flex flex-col items-center justify-center gap-2">
          {loading ? <RefreshCw className="w-5 h-5 animate-spin text-violet-600" /> : <CheckCircle2 className="w-5 h-5 text-violet-500" />}
          {loading ? 'Loading...' : text}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="pending" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Clock className="w-4 h-4 mr-2 text-violet-600" /> Pending Approval ({pendingList.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileCheck2 className="w-4 h-4 mr-2 text-purple-600" /> Approval History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">Indents Awaiting Approval</CardTitle>
                <CardDescription className="text-xs text-slate-500">Select the winning vendor, set the approved rate and sanction the indent for PO</CardDescription>
              </div>
              {searchBox(searchPending, setSearchPending, loadPending, loadingPending)}
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    {['Indent No.', 'Date', 'Project', 'Product'].map((h) => <TableHead key={h} className="text-xs font-bold text-slate-700">{h}</TableHead>)}
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Quotes</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPending || filteredPending.length === 0
                    ? emptyRow(8, loadingPending, 'No indents pending approval.')
                    : filteredPending.map((row, idx) => (
                        <TableRow key={`${row.id}-${row.item_id || idx}`} className="hover:bg-slate-50/70">
                          <TableCell className="font-semibold text-xs text-violet-700 whitespace-nowrap">{no(row, idx)}</TableCell>
                          <TableCell className="text-xs text-slate-600 whitespace-nowrap">{formatDate(row.indent_date || row.date || row.created_at)}</TableCell>
                          <TableCell className="text-xs font-medium text-slate-800">{row.project_name || '-'}</TableCell>
                          <TableCell className="text-xs font-medium text-slate-900 max-w-[200px] truncate" title={row.product_name}>{row.product_name || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity ?? '-'}</TableCell>
                          <TableCell className="text-xs text-slate-600">{row.uom || '-'}</TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">{(row.vendors || []).length} Quotes</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right whitespace-nowrap">
                            <Button size="sm" onClick={() => handleOpen(row)} className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8 px-3 gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Review & Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">Approval History</CardTitle>
                <CardDescription className="text-xs text-slate-500">Approved and rejected indents</CardDescription>
              </div>
              {searchBox(searchHistory, setSearchHistory, loadHistory, loadingHistory)}
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    {['Indent No.', 'Date', 'Project', 'Product'].map((h) => <TableHead key={h} className="text-xs font-bold text-slate-700">{h}</TableHead>)}
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Vendor</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Approved Rate</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistory || filteredHistory.length === 0
                    ? emptyRow(8, loadingHistory, 'No approvals recorded yet.')
                    : filteredHistory.map((row, idx) => (
                        <TableRow key={`${row.id}-${idx}`} className="hover:bg-slate-50/70">
                          <TableCell className="font-semibold text-xs text-violet-700 whitespace-nowrap">{no(row, idx)}</TableCell>
                          <TableCell className="text-xs text-slate-600 whitespace-nowrap">{formatDate(row.indent_date || row.date || row.created_at)}</TableCell>
                          <TableCell className="text-xs font-medium text-slate-800">{row.project_name || '-'}</TableCell>
                          <TableCell className="text-xs font-medium text-slate-900">{row.product_name || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity ?? '-'}</TableCell>
                          <TableCell className="text-xs font-semibold text-slate-800">{row.approved_vendor_name || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-bold text-emerald-700">{row.approved_rate ? `₹${Number(row.approved_rate).toLocaleString('en-IN')}` : '-'}</TableCell>
                          <TableCell className="text-xs">
                            <Badge className={cn('text-[11px] font-semibold border', row.approval_status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                              {row.approval_status === 'Rejected' ? 'Rejected' : 'Approved'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedIndent} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="w-[95vw] max-w-3xl sm:max-w-4xl bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-600" /> Vendor Selection & Rate Approval
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Choose the vendor, enter the approved rate and approve or reject</DialogDescription>
          </DialogHeader>

          {selectedIndent && (
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between gap-3 text-xs">
                <div><span className="text-slate-500">Indent No:</span> <b>{selectedIndent.indent_number || `PI-${selectedIndent.id}`}</b></div>
                <div><span className="text-slate-500">Project:</span> <b>{selectedIndent.project_name || '-'}</b></div>
                <div><span className="text-slate-500">Product:</span> <b>{selectedIndent.product_name || '-'}</b></div>
                <div><span className="text-slate-500">Qty:</span> <b className="text-blue-700">{selectedIndent.quantity} {selectedIndent.uom || ''}</b></div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Vendor</Label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="w-12 text-center text-xs font-bold">Pick</TableHead>
                        <TableHead className="text-xs font-bold">Vendor</TableHead>
                        <TableHead className="text-xs font-bold">Enquiry No</TableHead>
                        <TableHead className="text-xs font-bold text-right">GST %</TableHead>
                        <TableHead className="text-xs font-bold">Delivery</TableHead>
                        <TableHead className="text-xs font-bold">Payment Terms</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedIndent.vendors || []).length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-xs text-slate-500">No quotes found for this item.</TableCell></TableRow>
                      ) : (
                        selectedIndent.vendors.map((v: any, i: number) => {
                          const sel = vendorIdx === i;
                          return (
                            <TableRow key={i} onClick={() => setVendorIdx(i)} className={cn('cursor-pointer text-xs', sel ? 'bg-violet-50 border-l-4 border-l-violet-600' : 'hover:bg-slate-50')}>
                              <TableCell className="text-center"><input type="radio" name="vendor" checked={sel} onChange={() => setVendorIdx(i)} className="h-4 w-4" /></TableCell>
                              <TableCell className="font-semibold text-slate-900">
                                {v.vendor_name}
                                {sel && <Badge className="ml-2 bg-violet-600 text-white text-[10px] py-0 px-1.5"><Award className="w-2.5 h-2.5 mr-0.5 inline" />Selected</Badge>}
                              </TableCell>
                              <TableCell className="text-slate-600">{v.enquiry_no || '-'}</TableCell>
                              <TableCell className="text-right text-slate-600">{v.gst_percent || 0}%</TableCell>
                              <TableCell>{v.delivery_days ? `${v.delivery_days} Days` : 'Immediate'}</TableCell>
                              <TableCell className="text-slate-600">{v.payment_terms || '-'}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(['Approved', 'Rejected'] as const).map((d) => (
                  <label key={d} className={cn('flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-semibold',
                    decision === d ? (d === 'Approved' ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-red-400 bg-red-50 text-red-800') : 'border-slate-200 text-slate-600')}>
                    <input type="radio" name="decision" checked={decision === d} onChange={() => setDecision(d)} />
                    {d === 'Approved' ? 'Approve & send to PO' : 'Reject'}
                  </label>
                ))}
              </div>

              {decision === 'Approved' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Approved Rate (₹) <span className="text-red-500">*</span></Label>
                  <Input type="number" step="any" min="0" value={approvedRate} onChange={(e) => setApprovedRate(e.target.value)} placeholder="Enter approved rate" className="bg-white text-xs h-9 font-bold text-emerald-700" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Remarks</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for vendor selection / rate / rejection..." rows={3} className="bg-white text-xs" />
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
                <Button type="submit" disabled={submitting} className={cn('text-white font-semibold text-xs px-6', decision === 'Approved' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-red-600 hover:bg-red-700')}>
                  {submitting ? 'Submitting...' : decision === 'Approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
