// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { pmsApi } from '../../services/pmsApi';
import { uploadFile } from '@/lib/fetchers';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  DollarSign,
  Plus,
  Trash2,
  Clock,
  Search,
  CheckCircle2,
  Building2,
  FileCheck2,
  RefreshCw,
  Upload,
  Layers,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface VendorQuote {
  vendor_name: string;
  rate: number | string;
  gst_percent: number | string;
  payment_terms: string;
  delivery_days: number | string;
  quotation_file?: File | null;
  quotation_filename?: string;
  enquiry_no: string;
  enquiry_date: string;
  rate_unit: string;
  whatsapp: string;
  email: string;
  make: string;
}

const GST_OPTIONS = ['0', '5', '12', '18', '28'];
const PAYMENT_TERMS = ['Advance', '100% on Delivery', '7 Days Net', '15 Days Net', '30 Days Net', '45 Days Net', '60 Days Net'];
const UNIT_OPTIONS = ['Nos', 'Kg', 'MT', 'Bags', 'Mtr', 'Rmt', 'Sqm', 'Cum', 'Ltr', 'Set', 'Box', 'Day'];

const blankVendor = (): VendorQuote => ({
  vendor_name: '',
  rate: '',
  gst_percent: '18',
  payment_terms: '',
  delivery_days: '',
  enquiry_no: '',
  enquiry_date: '',
  rate_unit: '',
  whatsapp: '',
  email: '',
  make: '',
});

export default function PmsVendorRateView() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [pendingList, setPendingList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [searchPending, setSearchPending] = useState('');
  const [searchHistory, setSearchHistory] = useState('');

  // Selected Indent for Rates Dialog
  const [selectedIndent, setSelectedIndent] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Up to 3 vendor quotes
  const [vendors, setVendors] = useState<VendorQuote[]>([blankVendor()]);
  const [vendorType, setVendorType] = useState<'Regular' | 'Multiple'>('Regular');
  const [productCode, setProductCode] = useState('');
  const [comparisonFile, setComparisonFile] = useState<File | null>(null);
  const [vendorMaster, setVendorMaster] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get('/store/entity/vendors', { params: { order: 'vendor_name.asc', limit: 'all' } })
      .then((res: any) => setVendorMaster(Array.isArray(res) ? res : res?.data || []))
      .catch(() => {});
  }, []);

  // Load Pending Indents (Approved by engineer, awaiting vendor quotes)
  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const res = await pmsApi.get('/indents?stage=IndentApproved');
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
            });
          });
        } else {
          flattened.push(ind);
        }
      });
      setPendingList(flattened);
    } catch (err) {
      console.error('Failed to load approved indents', err);
    } finally {
      setLoadingPending(false);
    }
  };

  // Load History (VendorRated)
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await pmsApi.get('/indents?reviewed=vendor');
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
      setHistoryList(flattened);
    } catch (err) {
      console.error('Failed to load vendor rate history', err);
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

  const handleOpenRateModal = (row: any) => {
    setSelectedIndent(row);
    // Initialize with 1 empty quote or existing quotes
    const existing = row.vendors && row.vendors.length > 0 ? row.vendors : null;
    if (existing) {
      setVendors(
        existing.map((v: any) => ({
          ...blankVendor(),
          ...v,
          rate: v.rate ?? '',
          gst_percent: String(v.gst_percent ?? '18'),
          delivery_days: v.delivery_days ?? '',
          enquiry_date: v.enquiry_date ? String(v.enquiry_date).slice(0, 10) : '',
        }))
      );
    } else {
      setVendors([blankVendor()]);
    }
    setVendorType((row.vendor_type as any) || (existing && existing.length > 1 ? 'Multiple' : 'Regular'));
    setProductCode(row.product_code || '');
    setComparisonFile(null);
  };

  const handleCloseModal = () => {
    setSelectedIndent(null);
  };

  const handleAddVendor = () => {
    if (vendors.length >= 3) {
      toast.warning('Maximum 3 vendors allowed for rate comparison');
      return;
    }
    setVendors((prev) => [...prev, blankVendor()]);
  };

  const handleVendorTypeChange = (type: 'Regular' | 'Multiple') => {
    setVendorType(type);
    setVendors((prev) => {
      if (type === 'Regular') return prev.slice(0, 1);
      const next = [...prev];
      while (next.length < 2) next.push(blankVendor());
      return next;
    });
  };

  // Picking a vendor from the master fills their contact details and default payment term
  const handleVendorNameChange = (index: number, name: string) => {
    const match = vendorMaster.find((m) => (m.vendor_name || '').toLowerCase() === name.trim().toLowerCase());
    setVendors((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        vendor_name: name,
        ...(match
          ? {
              email: updated[index].email || match.email || '',
              whatsapp: updated[index].whatsapp || String(match.phone || '').replace(/\D/g, '').slice(-10),
              payment_terms: updated[index].payment_terms || match.payment_term || '',
            }
          : {}),
      };
      return updated;
    });
  };

  const handleRemoveVendor = (index: number) => {
    if (vendors.length <= 1) {
      toast.warning('At least one vendor rate is required');
      return;
    }
    setVendors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVendorChange = (index: number, field: keyof VendorQuote, value: any) => {
    setVendors((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // The file is uploaded on submit; only its URL is saved with the vendor quote
  const handleFileUpload = (index: number, file: File | null) => {
    if (!file) return;
    handleVendorChange(index, 'quotation_file', file);
    handleVendorChange(index, 'quotation_filename', file.name);
    toast.success(`Attached "${file.name}" for Vendor #${index + 1}`);
  };

  const handleSubmitRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndent) return;

    // Validate vendors
    for (let i = 0; i < vendors.length; i++) {
      const v = vendors[i];
      if (!v.vendor_name.trim()) {
        toast.error(`Vendor #${i + 1}: Name is required`);
        return;
      }
      if (!v.enquiry_no.trim()) {
        toast.error(`Vendor #${i + 1}: Enquiry No is required`);
        return;
      }
      if (!v.rate || Number(v.rate) <= 0) {
        toast.error(`Vendor #${i + 1}: Valid rate is required`);
        return;
      }
      if (!v.payment_terms) {
        toast.error(`Vendor #${i + 1}: Payment term is required`);
        return;
      }
      if (v.whatsapp && v.whatsapp.length !== 10) {
        toast.error(`Vendor #${i + 1}: WhatsApp number must be 10 digits`);
        return;
      }
    }
    if (vendorType === 'Multiple' && vendors.length < 2) {
      toast.error('Multiple vendor type needs at least 2 vendors');
      return;
    }

    setSubmitting(true);
    const id = selectedIndent.id || selectedIndent.indent_id;
    try {
      const quotationUrls = await Promise.all(
        vendors.map((v) =>
          v.quotation_file
            ? uploadFile({ file: v.quotation_file, folderId: 'pms/indents', subFolder: 'vendor-quotations' })
            : Promise.resolve(null)
        )
      );

      const comparisonUrl = comparisonFile
        ? await uploadFile({ file: comparisonFile, folderId: 'pms/indents', subFolder: 'comparison-sheets' })
        : selectedIndent.comparison_sheet_url || null;

      const res = await pmsApi.patch(`/indents/${id}/vendor-rates`, {
        status: 'VendorRated',
        item_id: selectedIndent.item_id,
        vendor_type: vendorType,
        product_code: productCode,
        comparison_sheet_url: comparisonUrl,
        comparison_sheet_filename: comparisonFile?.name || selectedIndent.comparison_sheet_filename || null,
        vendors: vendors.map((v, i) => ({
          vendor_name: v.vendor_name,
          rate: Number(v.rate),
          gst_percent: Number(v.gst_percent) || 0,
          payment_terms: v.payment_terms,
          delivery_days: Number(v.delivery_days) || 0,
          quotation_url: quotationUrls[i],
          quotation_filename: v.quotation_filename,
          enquiry_no: v.enquiry_no,
          enquiry_date: v.enquiry_date || null,
          rate_unit: v.rate_unit,
          whatsapp: v.whatsapp,
          email: v.email,
          make: v.make,
        })),
      });

      if (res?.error && !res.success) {
        toast.error(res.error || 'Failed to save vendor rates');
        return;
      }

      toast.success(
        `Vendor rates submitted for Indent ${selectedIndent.indent_number || 'PI'}`
      );
      handleCloseModal();
      loadPending();
    } catch (err: any) {
      toast.error(err?.message || 'Error updating vendor rates');
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
            <Clock className="w-4 h-4 mr-2 text-sky-600" />
            Pending Rate Entry ({pendingList.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileCheck2 className="w-4 h-4 mr-2 text-cyan-600" />
            Rates Updated History
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="space-y-4 mt-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Approved Indents Awaiting Quotations
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select an approved line item to log vendor quotes and commercial terms
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
                      <TableHead className="text-xs font-bold text-slate-700">Indenter</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Priority</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Product / Item</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Area of Use</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Expected Date</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Specs</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPending ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                            Loading indents awaiting vendor rates...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPending.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <CheckCircle2 className="w-5 h-5 text-sky-500" />
                            No pending indents awaiting vendor rates.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPending.map((row, idx) => {
                        const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                        const isCritical = row.priority === 'Critical';

                        return (
                          <TableRow key={`${row.id}-${row.item_id || idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-semibold text-xs text-sky-700 whitespace-nowrap">
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
                            <TableCell className="text-xs font-medium text-slate-900 max-w-[180px] truncate" title={row.product_name}>
                              {row.product_name || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-slate-900">{row.quantity ?? '-'}</TableCell>
                            <TableCell className="text-xs text-slate-600">{row.uom || '-'}</TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[140px] truncate" title={row.area_of_use}>
                              {row.area_of_use || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {formatDate(row.expected_date)}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 max-w-[160px] truncate" title={row.specifications}>
                              {row.specifications || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                onClick={() => handleOpenRateModal(row)}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs h-8 px-3 shadow-sm gap-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Update Rates
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
                  Vendor Rated Indents
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Indents with quotations logged, ready for technical and management sign-off
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
                      <TableHead className="text-xs font-bold text-slate-700">UOM</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-center">Quotes Count</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Lowest Rate</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingHistory ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                            Loading vendor rated records...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                          No indents with vendor rates recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((row, idx) => {
                        const indentNo = row.indent_number || row.indentNo || `PI-${String(row.id || idx).padStart(4, '0')}`;
                        const quotesCount = Array.isArray(row.vendors) ? row.vendors.length : 1;
                        let minRate = '-';
                        if (Array.isArray(row.vendors) && row.vendors.length > 0) {
                          const rates = row.vendors.map((v: any) => Number(v.rate)).filter((r: number) => !isNaN(r) && r > 0);
                          if (rates.length > 0) {
                            minRate = `₹${Math.min(...rates).toLocaleString('en-IN')}`;
                          }
                        }

                        return (
                          <TableRow key={`${row.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="font-semibold text-xs text-sky-700 whitespace-nowrap">
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
                            <TableCell className="text-xs text-slate-600">{row.uom || '-'}</TableCell>
                            <TableCell className="text-xs text-center font-bold text-slate-700">
                              <Badge variant="outline" className="text-xs">
                                {quotesCount} Quotes
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-emerald-700">{minRate}</TableCell>
                            <TableCell className="text-xs">
                              <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[11px] font-semibold">
                                VendorRated
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

      {/* UPDATE RATES DIALOG */}
      <Dialog open={!!selectedIndent} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="w-[95vw] max-w-3xl sm:max-w-5xl bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-sky-600" />
              Enter Vendor Quotations (Up to 3 Vendors)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Log commercial rates, GST, payment terms, and delivery schedules from competing suppliers
            </DialogDescription>
          </DialogHeader>

          {selectedIndent && (
            <form onSubmit={handleSubmitRates} className="space-y-5 pt-2">
              {/* Product Header Card */}
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
                  <span className="text-slate-500 font-medium">Product / Item:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedIndent.product_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Required Qty:</span>{' '}
                  <span className="font-bold text-blue-700">
                    {selectedIndent.quantity} {selectedIndent.uom || ''}
                  </span>
                </div>
              </div>

              <datalist id="pms-vendor-master">
                {vendorMaster.map((m) => (
                  <option key={m.id} value={m.vendor_name} />
                ))}
              </datalist>

              {/* Vendor type, product code, comparison sheet */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Vendor Type</Label>
                  <select
                    value={vendorType}
                    onChange={(e) => handleVendorTypeChange(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                  >
                    <option value="Regular">Regular Vendor</option>
                    <option value="Multiple">Multiple Vendor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Product Code (Optional)</Label>
                  <Input
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    placeholder="Enter product code"
                    className="bg-white text-xs h-9"
                  />
                </div>
                {vendorType === 'Multiple' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Comparison Sheet (Optional)</Label>
                    <Input
                      type="file"
                      onChange={(e) => setComparisonFile(e.target.files?.[0] || null)}
                      className="bg-white text-xs h-9 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-sky-50 file:text-sky-700"
                    />
                  </div>
                )}
              </div>

              {/* Repeating Vendor Entry Rows */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Supplier Quotes ({vendors.length}/3)
                  </Label>
                  {vendorType === 'Multiple' && vendors.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddVendor}
                      className="text-xs font-semibold border-sky-300 text-sky-700 hover:bg-sky-50 h-8 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Vendor Quote
                    </Button>
                  )}
                </div>

                {vendors.map((vendor, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-slate-200 rounded-xl bg-gradient-to-b from-white to-slate-50/50 space-y-3 relative shadow-sm"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-sky-900 text-white font-bold text-xs px-2.5 py-0.5">
                          Vendor Quote #{idx + 1}
                        </Badge>
                        {vendor.vendor_name && (
                          <span className="text-xs font-semibold text-slate-700">{vendor.vendor_name}</span>
                        )}
                      </div>
                      {vendorType === 'Multiple' && vendors.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVendor(idx)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Vendor Name (from vendor master, free text allowed) */}
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs font-medium text-slate-600">
                          Vendor Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          list="pms-vendor-master"
                          value={vendor.vendor_name}
                          onChange={(e) => handleVendorNameChange(idx, e.target.value)}
                          placeholder="Select or type vendor"
                          className="bg-white text-xs h-9"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          Enquiry No <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={vendor.enquiry_no}
                          onChange={(e) => handleVendorChange(idx, 'enquiry_no', e.target.value)}
                          placeholder="Quotation no."
                          className="bg-white text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">Enquiry Date</Label>
                        <Input
                          type="date"
                          value={vendor.enquiry_date}
                          onChange={(e) => handleVendorChange(idx, 'enquiry_date', e.target.value)}
                          className="bg-white text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Basic Rate (₹) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={vendor.rate}
                          onChange={(e) => handleVendorChange(idx, 'rate', e.target.value)}
                          placeholder="Enter basic rate"
                          className="bg-white text-xs h-9 font-bold text-emerald-700"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">Unit</Label>
                        <select
                          value={vendor.rate_unit}
                          onChange={(e) => handleVendorChange(idx, 'rate_unit', e.target.value)}
                          className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                        >
                          <option value="">Select Unit</option>
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">GST %</Label>
                        <select
                          value={String(vendor.gst_percent)}
                          onChange={(e) => handleVendorChange(idx, 'gst_percent', e.target.value)}
                          className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                        >
                          {GST_OPTIONS.map((g) => (
                            <option key={g} value={g}>{g}%</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs font-medium text-slate-600">
                          Payment Term <span className="text-red-500">*</span>
                        </Label>
                        <select
                          value={vendor.payment_terms}
                          onChange={(e) => handleVendorChange(idx, 'payment_terms', e.target.value)}
                          className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                        >
                          <option value="">Select payment term</option>
                          {[...new Set([...PAYMENT_TERMS, vendor.payment_terms].filter(Boolean))].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">WhatsApp</Label>
                        <Input
                          value={vendor.whatsapp}
                          maxLength={10}
                          onChange={(e) => handleVendorChange(idx, 'whatsapp', e.target.value.replace(/\D/g, ''))}
                          placeholder="WhatsApp no."
                          className="bg-white text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs font-medium text-slate-600">Email ID</Label>
                        <Input
                          type="email"
                          value={vendor.email}
                          onChange={(e) => handleVendorChange(idx, 'email', e.target.value)}
                          placeholder="Email"
                          className="bg-white text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">Delivery Time (Days)</Label>
                        <Input
                          type="number"
                          value={vendor.delivery_days}
                          onChange={(e) => handleVendorChange(idx, 'delivery_days', e.target.value)}
                          placeholder="Days"
                          className="bg-white text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs font-medium text-slate-600">Make</Label>
                        <Input
                          value={vendor.make}
                          onChange={(e) => handleVendorChange(idx, 'make', e.target.value)}
                          placeholder="Make"
                          className="bg-white text-xs h-9"
                        />
                      </div>

                      {/* File Attachment */}
                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs font-medium text-slate-600">Quotation Document (PDF / Scan)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            onChange={(e) => handleFileUpload(idx, e.target.files?.[0] || null)}
                            className="bg-white text-xs h-9 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-sky-50 file:text-sky-700"
                          />
                          {vendor.quotation_filename && (
                            <Badge variant="secondary" className="text-[11px] truncate max-w-[200px]">
                              {vendor.quotation_filename}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-6 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting...
                    </>
                  ) : (
                    'Save Vendor Rates'
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
