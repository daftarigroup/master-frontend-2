// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { pmsApi } from '../../services/pmsApi';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  FileCheck2,
  AlertCircle,
  Building2,
  RefreshCw,
  Calendar as CalendarIcon,
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

export default function PmsIndentApprovalView() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [pendingList, setPendingList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [searchPending, setSearchPending] = useState('');
  const [searchHistory, setSearchHistory] = useState('');

  // Selected Indent for Approval Dialog
  const [selectedIndent, setSelectedIndent] = useState<any | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Pending Indents
  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const res = await pmsApi.get('/indents?status=Pending,IndentApproved');
      const list = Array.isArray(res) ? res : res?.data || [];
      // Flatten indents with multiple items if returned at indent-level or item-level
      const flattened: any[] = [];
      list.forEach((ind: any) => {
        if (Array.isArray(ind.items) && ind.items.length > 0) {
          ind.items.forEach((it: any, idx: number) => {
            if (it.indent_status) return;
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
              attachment: it.attachment,
              attachment_name: it.attachment_name,
            });
          });
        } else {
          flattened.push(ind);
        }
      });
      setPendingList(flattened);
    } catch (err) {
      console.error('Failed to load pending indents', err);
    } finally {
      setLoadingPending(false);
    }
  };

  // Load History Indents
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await pmsApi.get('/indents?reviewed=indent');
      const list = Array.isArray(res) ? res : res?.data || [];
      const flattened: any[] = [];
      list.forEach((ind: any) => {
        if (Array.isArray(ind.items) && ind.items.length > 0) {
          ind.items.forEach((it: any, idx: number) => {
            flattened.push({
              ...ind,
              item_id: it.id || idx,
              status: it.indent_status || ind.status,
              group_head: it.group_head,
              area_of_use: it.area_of_use,
              product_name: it.product_name,
              quantity: it.quantity,
              uom: it.uom,
              expected_date: it.expected_date,
              specifications: it.specifications,
            });
          });
        } else {
          flattened.push(ind);
        }
      });
      setHistoryList(flattened);
    } catch (err) {
      console.error('Failed to load approval history', err);
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
    setApprovalDecision('Approved');
    setApprovalRemarks('');
  };

  const handleCloseModal = () => {
    setSelectedIndent(null);
    setApprovalRemarks('');
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndent) return;

    const id = selectedIndent.id || selectedIndent.indent_id;
    setSubmitting(true);
    try {
      const res = await pmsApi.patch(`/indents/${id}/approve`, {
        status: approvalDecision,
        remarks: approvalRemarks,
        item_id: selectedIndent.item_id,
      });

      if (res?.error && !res.success) {
        toast.error(res.error || 'Failed to submit decision');
        return;
      }

      toast.success(
        `Indent ${selectedIndent.indent_number || 'PI'} marked as ${approvalDecision}`
      );
      handleCloseModal();
      loadPending();
    } catch (err: any) {
      toast.error(err?.message || 'Error updating approval status');
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredPending = pendingList.filter((row) => {
    const q = searchPending.toLowerCase();
    const indNo = String(row.indent_number || row.indentNo || '').toLowerCase();
    const proj = String(row.project_name || row.projectName || '').toLowerCase();
    const prod = String(row.product_name || row.product || '').toLowerCase();
    const ind = String(row.indenter_name || row.indenter || '').toLowerCase();
    return indNo.includes(q) || proj.includes(q) || prod.includes(q) || ind.includes(q);
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
            Pending Approval ({pendingList.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileCheck2 className="w-4 h-4 mr-2 text-emerald-600" />
            Approval History
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="space-y-4 mt-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Pending Indent Requisitions
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Showing all pending indents awaiting initial project manager / engineer sign-off
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
                      <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Action</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Indent No.</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Date</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Project</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Indenter</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Priority</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Group Head</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Product / Equipment</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Expected Date</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Specs / Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPending ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                            Loading pending indents...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPending.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            No pending indents awaiting approval.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPending.map((row, idx) => {
                        const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                        const isCritical = row.priority === 'Critical';

                        return (
                          <TableRow key={`${row.id}-${row.item_id || idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="text-xs whitespace-nowrap">
                              <Button
                                size="sm"
                                onClick={() => handleOpenApproveModal(row)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-3 shadow-sm gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </Button>
                            </TableCell>
                            <TableCell className="font-semibold text-xs text-emerald-700 whitespace-nowrap">
                              {indentNo}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {formatDate(row.indent_date || row.date || row.created_at)}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-800 whitespace-nowrap">
                              {row.project_name || row.projectName || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {row.indenter_name || row.indenter || '-'}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {isCritical ? (
                                <Badge className="bg-red-50 text-red-700 border-red-200 text-[11px] font-semibold">
                                  Critical
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-600 bg-slate-50 text-[11px]">
                                  Non-Critical
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">{row.group_head || '-'}</TableCell>
                            <TableCell className="text-xs font-medium text-slate-900 max-w-[180px] truncate" title={row.product_name}>
                              {row.product_name || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity ?? '-'}</TableCell>
                            <TableCell className="text-xs text-slate-600">{row.uom || '-'}</TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {formatDate(row.expected_date)}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 max-w-[160px] truncate" title={row.specifications}>
                              {row.specifications || '-'}
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
                  Approved & Rejected Indents Register
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Audit trail of all indents processed at the initial verification stage
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
                      <TableHead className="text-xs font-bold text-slate-700">Indenter</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Product</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Decision</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingHistory ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                            Loading approval history...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          No processed indents in history.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((row, idx) => {
                        const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                        const isApproved = row.status === 'Approved';

                        return (
                          <TableRow key={`${row.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-semibold text-xs text-emerald-700 whitespace-nowrap">
                              {indentNo}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {formatDate(row.indent_date || row.date || row.created_at)}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-800">
                              {row.project_name || row.projectName || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {row.indenter_name || row.indenter || '-'}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-900">{row.product_name || '-'}</TableCell>
                            <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity ?? '-'}</TableCell>
                            <TableCell className="text-xs text-slate-600">{row.uom || '-'}</TableCell>
                            <TableCell className="text-xs">
                              <Badge
                                className={cn(
                                  'text-[11px] font-semibold',
                                  isApproved
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                )}
                              >
                                {isApproved ? 'Approved' : 'Rejected'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[200px] truncate" title={row.approval_remarks || row.remarks}>
                              {row.approval_remarks || row.remarks || '-'}
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

      {/* APPROVAL DIALOG */}
      <Dialog open={!!selectedIndent} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6 shadow-xl">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              Review Indent Requisition
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Verify requested item details and record approval decision
            </DialogDescription>
          </DialogHeader>

          {selectedIndent && (
            <form onSubmit={handleApprovalSubmit} className="space-y-4 pt-2">
              {/* Read-Only Details Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 font-medium">Indent No:</span>{' '}
                    <span className="font-bold text-slate-800">
                      {selectedIndent.indent_number || selectedIndent.indentNo || `PI-${selectedIndent.id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Date:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {formatDate(selectedIndent.indent_date || selectedIndent.date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Project:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {selectedIndent.project_name || selectedIndent.projectName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Indenter:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {selectedIndent.indenter_name || selectedIndent.indenter || '-'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 font-medium">Product / Item:</span>{' '}
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {selectedIndent.product_name || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Quantity:</span>{' '}
                    <span className="font-bold text-blue-700 block mt-0.5">
                      {selectedIndent.quantity} {selectedIndent.uom || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Required By:</span>{' '}
                    <span className="text-slate-700 block mt-0.5">{formatDate(selectedIndent.expected_date)}</span>
                  </div>
                </div>

                {selectedIndent.specifications && (
                  <div className="border-t border-slate-200 pt-2">
                    <span className="text-slate-500 font-medium">Specifications:</span>
                    <p className="text-slate-700 mt-1 italic">{selectedIndent.specifications}</p>
                  </div>
                )}
              </div>

              {/* Decision Radio */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Approval Decision</Label>
                <RadioGroup
                  value={approvalDecision}
                  onValueChange={(val: any) => setApprovalDecision(val)}
                  className="grid grid-cols-2 gap-4"
                >
                  <label
                    htmlFor="decision-approved"
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all',
                      approvalDecision === 'Approved'
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <RadioGroupItem value="Approved" id="decision-approved" />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs">Approve Indent</span>
                  </label>

                  <label
                    htmlFor="decision-rejected"
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all',
                      approvalDecision === 'Rejected'
                        ? 'border-rose-500 bg-rose-50/60 text-rose-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <RadioGroupItem value="Rejected" id="decision-rejected" />
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs">Reject Indent</span>
                  </label>
                </RadioGroup>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Remarks / Approval Notes</Label>
                <Textarea
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="Provide comments, reasons for rejection, or procurement instructions..."
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
                    approvalDecision === 'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  )}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting...
                    </>
                  ) : (
                    `Confirm ${approvalDecision}`
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
