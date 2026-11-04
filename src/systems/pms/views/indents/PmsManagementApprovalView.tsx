// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { pmsApi } from '../../services/pmsApi';
import { toast } from 'sonner';
import {
  DollarSign,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  FileCheck2,
  RefreshCw,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

export default function PmsManagementApprovalView() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [pendingList, setPendingList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [searchPending, setSearchPending] = useState('');
  const [searchHistory, setSearchHistory] = useState('');

  // Selected Indent for Management Approval
  const [selectedIndent, setSelectedIndent] = useState<any | null>(null);
  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [approvedRate, setApprovedRate] = useState<number | string>('');
  const [managementRemarks, setManagementRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Pending (TechnicalApproved)
  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const res = await pmsApi.get('/indents?status=TechnicalApproved');
      const list = Array.isArray(res) ? res : res?.data || [];
      const flattened: any[] = [];
      list.forEach((ind: any) => {
        if (Array.isArray(ind.items) && ind.items.length > 0) {
          ind.items.forEach((it: any, idx: number) => {
            flattened.push({
              ...ind,
              item_id: it.id || idx,
              group_head: it.group_head,
              area_of_use: it.area_of_use,
              product_name: it.product_name,
              quantity: it.quantity,
              uom: it.uom,
              expected_date: it.expected_date,
              specifications: it.specifications,
              selected_vendor: it.selected_vendor || ind.selected_vendor,
              technical_remarks: it.technical_remarks || ind.technical_remarks,
            });
          });
        } else {
          flattened.push(ind);
        }
      });
      setPendingList(flattened);
    } catch (err) {
      console.error('Failed to load indents for management approval', err);
    } finally {
      setLoadingPending(false);
    }
  };

  // Load History (ManagementApproved)
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await pmsApi.get('/indents?reviewed=management');
      const list = Array.isArray(res) ? res : res?.data || [];
      const flattened: any[] = [];
      list.forEach((ind: any) => {
        if (Array.isArray(ind.items) && ind.items.length > 0) {
          ind.items.forEach((it: any, idx: number) => {
            flattened.push({
              ...ind,
              item_id: it.id || idx,
              product_name: it.product_name,
              quantity: it.quantity,
              uom: it.uom,
              selected_vendor: it.selected_vendor || ind.selected_vendor,
              approved_rate: it.approved_rate || ind.approved_rate,
              management_remarks: it.management_remarks || ind.management_remarks,
            });
          });
        } else {
          flattened.push(ind);
        }
      });
      setHistoryList(flattened);
    } catch (err) {
      console.error('Failed to load management approval history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else {
      loadPending();
    }
  }, [activeTab]);

  const handleOpenApproveModal = (row: any) => {
    setSelectedIndent(row);
    setDecision('Approved');
    const vRate = row.selected_vendor?.rate || row.rate || '';
    setApprovedRate(vRate);
    setManagementRemarks('');
  };

  const handleCloseModal = () => {
    setSelectedIndent(null);
    setApprovedRate('');
    setManagementRemarks('');
  };

  const handleSubmitManagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndent) return;

    if (decision === 'Approved' && (!approvedRate || Number(approvedRate) <= 0)) {
      toast.error('Please enter a valid approved rate');
      return;
    }

    setSubmitting(true);
    const id = selectedIndent.id || selectedIndent.indent_id;
    try {
      const res = await pmsApi.patch(`/indents/${id}/management-approval`, {
        status: decision === 'Approved' ? 'ManagementApproved' : 'Rejected',
        item_id: selectedIndent.item_id,
        approved_rate: Number(approvedRate),
        po_required: decision === 'Approved',
        remarks: managementRemarks,
      });

      if (res?.error && !res.success) {
        toast.error(res.error || 'Failed to submit management sign-off');
        return;
      }

      toast.success(
        `Management decision recorded for Indent ${selectedIndent.indent_number || 'PI'}`
      );
      handleCloseModal();
      loadPending();
    } catch (err: any) {
      toast.error(err?.message || 'Error updating management approval');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPending = pendingList.filter((row) => {
    const q = searchPending.toLowerCase();
    const indNo = String(row.indent_number || row.indentNo || '').toLowerCase();
    const proj = String(row.project_name || row.projectName || '').toLowerCase();
    const prod = String(row.product_name || row.product || '').toLowerCase();
    return indNo.includes(q) || proj.includes(q) || prod.includes(q);
  });

  const filteredHistory = historyList.filter((row) => {
    const q = searchHistory.toLowerCase();
    const indNo = String(row.indent_number || row.indentNo || '').toLowerCase();
    const proj = String(row.project_name || row.projectName || '').toLowerCase();
    const prod = String(row.product_name || row.product || '').toLowerCase();
    return indNo.includes(q) || proj.includes(q) || prod.includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="pending" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Clock className="w-4 h-4 mr-2 text-amber-600" />
            Pending Rate Sanction ({pendingList.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileCheck2 className="w-4 h-4 mr-2 text-orange-600" />
            Approved Rates Register
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="space-y-4 mt-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Technically Recommended Indents Awaiting Rate Sign-off
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Approve final commercial rate and authorize issuance of Purchase Order
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search by indent, project, product..."
                    value={searchPending}
                    onChange={(e) => setSearchPending(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPending}
                  disabled={loadingPending}
                  className="h-9 px-3 text-xs bg-white gap-1.5"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', loadingPending && 'animate-spin')} />
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
                      <TableHead className="text-xs font-bold text-slate-700">Product</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Recommended Vendor</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Quoted Rate</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPending ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
                            Loading indents for management sign-off...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPending.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <CheckCircle2 className="w-5 h-5 text-amber-500" />
                            No indents pending management approval.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPending.map((row, idx) => {
                        const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                        const vendor = row.selected_vendor;
                        const vName = vendor?.vendor_name || '-';
                        const vRate = vendor?.rate ? `₹${Number(vendor.rate).toLocaleString('en-IN')}` : '-';

                        return (
                          <TableRow key={`${row.id}-${row.item_id || idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-semibold text-xs text-amber-700 whitespace-nowrap">
                              {indentNo}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {formatDate(row.indent_date || row.date || row.created_at)}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-800">
                              {row.project_name || row.projectName || '-'}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-900 max-w-[200px] truncate" title={row.product_name}>
                              {row.product_name || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity ?? '-'}</TableCell>
                            <TableCell className="text-xs text-slate-600">{row.uom || '-'}</TableCell>
                            <TableCell className="text-xs font-semibold text-slate-800">{vName}</TableCell>
                            <TableCell className="text-xs text-right font-bold text-emerald-700">{vRate}</TableCell>
                            <TableCell className="text-xs text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                onClick={() => handleOpenApproveModal(row)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs h-8 px-3 shadow-sm gap-1"
                              >
                                <BadgeCheck className="w-3.5 h-3.5" /> Approve Rate
                              </Button>
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
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4 mt-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Management Approved Requisitions
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Fully authorized indents ready for Purchase Order generation
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search history..."
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="h-9 px-3 text-xs bg-white gap-1.5"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', loadingHistory && 'animate-spin')} />
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
                      <TableHead className="text-xs font-bold text-slate-700">Product</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Vendor</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Approved Rate</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Remarks</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingHistory ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
                            Loading approved rates history...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          No management approved indents recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((row, idx) => {
                        const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                        const vendor = row.selected_vendor;
                        const vName = vendor?.vendor_name || row.approved_vendor_name || '-';
                        const appRate = row.approved_rate ? `₹${Number(row.approved_rate).toLocaleString('en-IN')}` : '-';

                        return (
                          <TableRow key={`${row.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-semibold text-xs text-amber-700 whitespace-nowrap">
                              {indentNo}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {formatDate(row.indent_date || row.date || row.created_at)}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-800">
                              {row.project_name || row.projectName || '-'}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-900">{row.product_name || '-'}</TableCell>
                            <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity ?? '-'}</TableCell>
                            <TableCell className="text-xs font-semibold text-slate-800">{vName}</TableCell>
                            <TableCell className="text-xs text-right font-bold text-emerald-700">{appRate}</TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[180px] truncate" title={row.management_remarks}>
                              {row.management_remarks || '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                                ManagementApproved
                              </Badge>
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
        </TabsContent>
      </Tabs>

      {/* APPROVE RATE DIALOG */}
      <Dialog open={!!selectedIndent} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="w-[95vw] max-w-xl sm:max-w-2xl bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              Executive Rate Sanction & Authorization
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sanction commercial rate and authorize issuance of Purchase Order
            </DialogDescription>
          </DialogHeader>

          {selectedIndent && (
            <form onSubmit={handleSubmitManagement} className="space-y-4 pt-2">
              {/* Product & Recommended Vendor Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 font-medium">Indent No:</span>{' '}
                    <span className="font-bold text-slate-900">{selectedIndent.indent_number || `PI-${selectedIndent.id}`}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Project:</span>{' '}
                    <span className="font-semibold text-slate-800">{selectedIndent.project_name || '-'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 font-medium">Product / Item:</span>{' '}
                    <span className="font-bold text-slate-900 block mt-0.5">{selectedIndent.product_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Quantity:</span>{' '}
                    <span className="font-bold text-blue-700 block mt-0.5">
                      {selectedIndent.quantity} {selectedIndent.uom || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Recommended Vendor:</span>{' '}
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {selectedIndent.selected_vendor?.vendor_name || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Quoted Rate:</span>{' '}
                    <span className="font-bold text-emerald-700 block mt-0.5">
                      ₹{Number(selectedIndent.selected_vendor?.rate || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Decision Radio */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Executive Decision</Label>
                <RadioGroup
                  value={decision}
                  onValueChange={(val: any) => setDecision(val)}
                  className="grid grid-cols-2 gap-4"
                >
                  <label
                    htmlFor="rate-approved"
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all',
                      decision === 'Approved'
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <RadioGroupItem value="Approved" id="rate-approved" />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs">Sanction & Approve Rate</span>
                  </label>

                  <label
                    htmlFor="rate-rejected"
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all',
                      decision === 'Rejected'
                        ? 'border-rose-500 bg-rose-50/60 text-rose-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <RadioGroupItem value="Rejected" id="rate-rejected" />
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs">Reject Requisition</span>
                  </label>
                </RadioGroup>
              </div>

              {/* Final Approved Rate Input */}
              {decision === 'Approved' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Final Approved Rate (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={approvedRate}
                    onChange={(e) => setApprovedRate(e.target.value)}
                    placeholder="Enter negotiated/approved unit rate"
                    className="bg-white text-sm h-10 font-bold text-emerald-700"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    Pre-filled with technical quote. Adjust here if management negotiated additional discounts.
                  </p>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Management Remarks</Label>
                <Textarea
                  value={managementRemarks}
                  onChange={(e) => setManagementRemarks(e.target.value)}
                  placeholder="Terms, payment milestone authorizations, or reason for rejection..."
                  rows={3}
                  className="bg-white text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'text-white font-semibold text-xs px-6 shadow-sm',
                    decision === 'Approved'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  )}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting...
                    </>
                  ) : (
                    `Confirm ${decision === 'Approved' ? 'Rate Sanction' : 'Rejection'}`
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
