// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { pmsApi } from '../../services/pmsApi';
import { toast } from 'sonner';
import {
  FileText,
  Clock,
  Search,
  CheckCircle2,
  Building2,
  FileCheck2,
  RefreshCw,
  Scale,
  Award,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

export default function PmsTechnicalApprovalView() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [pendingList, setPendingList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [searchPending, setSearchPending] = useState('');
  const [searchHistory, setSearchHistory] = useState('');

  // Selected Indent for Technical Review
  const [selectedIndent, setSelectedIndent] = useState<any | null>(null);
  const [selectedVendorIndex, setSelectedVendorIndex] = useState<number | null>(null);
  const [technicalRemarks, setTechnicalRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Pending (VendorRated)
  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const res = await pmsApi.get('/indents?status=VendorRated');
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
              vendors: it.vendors || ind.vendors || [],
            });
          });
        } else {
          flattened.push(ind);
        }
      });
      setPendingList(flattened);
    } catch (err) {
      console.error('Failed to load indents for technical review', err);
    } finally {
      setLoadingPending(false);
    }
  };

  // Load History (TechnicalApproved)
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await pmsApi.get('/indents?reviewed=technical');
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
              technical_remarks: it.technical_remarks || ind.technical_remarks,
            });
          });
        } else {
          flattened.push(ind);
        }
      });
      setHistoryList(flattened);
    } catch (err) {
      console.error('Failed to load technical approval history', err);
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

  const handleOpenReviewModal = (row: any) => {
    setSelectedIndent(row);
    setSelectedVendorIndex(0); // Default to first vendor
    setTechnicalRemarks('');
  };

  const handleCloseModal = () => {
    setSelectedIndent(null);
    setSelectedVendorIndex(null);
    setTechnicalRemarks('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndent) return;

    const vendors = Array.isArray(selectedIndent.vendors) ? selectedIndent.vendors : [];
    if (vendors.length === 0) {
      toast.error('No vendor quotations available on this indent');
      return;
    }
    if (selectedVendorIndex === null || !vendors[selectedVendorIndex]) {
      toast.error('Please select a preferred vendor');
      return;
    }

    const chosenVendor = vendors[selectedVendorIndex];

    setSubmitting(true);
    const id = selectedIndent.id || selectedIndent.indent_id;
    try {
      const res = await pmsApi.patch(`/indents/${id}/technical-approval`, {
        status: 'TechnicalApproved',
        item_id: selectedIndent.item_id,
        selected_vendor: chosenVendor,
        remarks: technicalRemarks,
      });

      if (res?.error && !res.success) {
        toast.error(res.error || 'Failed to submit technical recommendation');
        return;
      }

      toast.success(
        `Technical approval submitted for Indent ${selectedIndent.indent_number || 'PI'}`
      );
      handleCloseModal();
      loadPending();
    } catch (err: any) {
      toast.error(err?.message || 'Error updating technical approval');
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
            <Clock className="w-4 h-4 mr-2 text-violet-600" />
            Pending Technical Review ({pendingList.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileCheck2 className="w-4 h-4 mr-2 text-purple-600" />
            Evaluation History
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="space-y-4 mt-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Indents with Vendor Quotes Awaiting Technical Sign-off
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Review specifications and supplier capabilities to recommend the winning quotation
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
                      <TableHead className="text-xs font-bold text-slate-700 text-center">Quotes Available</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPending ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-violet-600" />
                            Loading indents for technical review...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPending.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <CheckCircle2 className="w-5 h-5 text-violet-500" />
                            No indents pending technical evaluation.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPending.map((row, idx) => {
                        const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                        const quotesCount = Array.isArray(row.vendors) ? row.vendors.length : 1;

                        return (
                          <TableRow key={`${row.id}-${row.item_id || idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-semibold text-xs text-violet-700 whitespace-nowrap">
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
                            <TableCell className="text-xs text-center">
                              <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                                {quotesCount} Quotes Logged
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                onClick={() => handleOpenReviewModal(row)}
                                className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs h-8 px-3 shadow-sm gap-1"
                              >
                                <Scale className="w-3.5 h-3.5" /> Review & Select
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
                  Technically Approved Indents
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Indents evaluated and recommended to management for final rate sanction
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
                      <TableHead className="text-xs font-bold text-slate-700">Recommended Vendor</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Rate</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Remarks</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingHistory ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-violet-600" />
                            Loading evaluation history...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          No technically approved indents in history.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((row, idx) => {
                        const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                        const vendor = row.selected_vendor;
                        const vName = vendor?.vendor_name || row.approved_vendor_name || '-';
                        const vRate = vendor?.rate ? `₹${Number(vendor.rate).toLocaleString('en-IN')}` : '-';

                        return (
                          <TableRow key={`${row.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-semibold text-xs text-violet-700 whitespace-nowrap">
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
                            <TableCell className="text-xs text-right font-bold text-emerald-700">{vRate}</TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[180px] truncate" title={row.technical_remarks}>
                              {row.technical_remarks || '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold">
                                TechnicalApproved
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

      {/* REVIEW & COMPARISON DIALOG */}
      <Dialog open={!!selectedIndent} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="w-[95vw] max-w-3xl sm:max-w-4xl bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-violet-600" />
              Technical Vendor Comparison & Recommendation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select the best-fit vendor based on commercial rate, delivery schedule, and quality compliance
            </DialogDescription>
          </DialogHeader>

          {selectedIndent && (
            <form onSubmit={handleSubmitReview} className="space-y-5 pt-2">
              {/* Product Header */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Indent No:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedIndent.indent_number || `PI-${selectedIndent.id}`}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Project:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedIndent.project_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Product:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedIndent.product_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Required Qty:</span>{' '}
                  <span className="font-bold text-blue-700">
                    {selectedIndent.quantity} {selectedIndent.uom || ''}
                  </span>
                </div>
              </div>

              {/* Vendor Comparison Table */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Preferred Supplier (Click Row to Select)
                </Label>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="w-12 text-center text-xs font-bold">Pick</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700">Vendor Name</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-right">Unit Rate (₹)</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-right">GST %</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700">Delivery Period</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700">Payment Terms</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!selectedIndent.vendors || selectedIndent.vendors.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-500">
                            No quotes found for this item.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedIndent.vendors.map((v: any, vIdx: number) => {
                          const isSelected = selectedVendorIndex === vIdx;
                          return (
                            <TableRow
                              key={vIdx}
                              onClick={() => setSelectedVendorIndex(vIdx)}
                              className={cn(
                                'cursor-pointer transition-colors text-xs',
                                isSelected ? 'bg-violet-50 font-medium border-l-4 border-l-violet-600' : 'hover:bg-slate-50'
                              )}
                            >
                              <TableCell className="text-center">
                                <input
                                  type="radio"
                                  name="selected_vendor"
                                  checked={isSelected}
                                  onChange={() => setSelectedVendorIndex(vIdx)}
                                  className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                                />
                              </TableCell>
                              <TableCell className="font-semibold text-slate-900 flex items-center gap-2">
                                {v.vendor_name}
                                {isSelected && (
                                  <Badge className="bg-violet-600 text-white text-[10px] py-0 px-1.5">
                                    <Award className="w-2.5 h-2.5 mr-0.5 inline" /> Selected
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold text-emerald-700">
                                ₹{Number(v.rate || 0).toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell className="text-right text-slate-600">{v.gst_percent || 0}%</TableCell>
                              <TableCell className="text-slate-700">
                                {v.delivery_days ? `${v.delivery_days} Days` : 'Immediate'}
                              </TableCell>
                              <TableCell className="text-slate-600">{v.payment_terms || '-'}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Technical Remarks */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Technical Justification & Remarks
                </Label>
                <Textarea
                  value={technicalRemarks}
                  onChange={(e) => setTechnicalRemarks(e.target.value)}
                  placeholder="Justification for selecting this vendor (compliance with BIS standards, lowest cost, faster delivery)..."
                  rows={3}
                  className="bg-white text-xs"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs px-6 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting...
                    </>
                  ) : (
                    'Confirm Technical Recommendation'
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
