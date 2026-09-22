'use client';

import axios from 'axios';
import {
 AlertCircle,
 Calendar,
 Clock,
 FileText,
 History,
 IndianRupee,
 Info,
 LayoutDashboard,
 Loader2,
 MapPin,
 Phone,
 Search,
 Truck,
 Upload,
 User,
 X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { putFileToS3 } from '@/lib/s3Upload';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useRepairSystem } from '../../server/tanstackQuery/useRepairSystem';

const SentMachinePage = () => {
 const currentUser = useAppSelector(selectUser);
 const {
 usePendingOuthouseSent,
 useOuthouseSentHistory,
 recordOuthouseDispatchMutation,
 getUploadUrl,
 } = useRepairSystem();

 const { data: pendingIndents = [], isLoading: isLoadingPending } = usePendingOuthouseSent();
 const { data: historyItems = [], isLoading: isLoadingHistory } = useOuthouseSentHistory();

 const [activeSection, setActiveSection] = useState<'pending' | 'history'>('pending');
 const [searchTerm, setSearchTerm] = useState('');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
 const [selectedIndent, setSelectedIndent] = useState<any>(null);
 const [selectedItemForDetails, setSelectedItemForDetails] = useState<{
 indent: any;
 outhouse: any;
 } | null>(null);

  const getDefaultExpectedReturnDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  };

  // Form State
  const [dispatchData, setDispatchData] = useState({
    transporterName: '',
    vehicleNo: '',
    driverName: '',
    driverContact: '',
    expectedReturnDate: getDefaultExpectedReturnDate(),
    transportationCharges: '',
    weighmentSlipNo: '',
    transportImage: '',
    paymentType: 'Cash',
    paymentAmount: '',
  });

 const [uploading, setUploading] = useState(false);

 const formatDate = (val?: string | null) => {
 if (!val) return '—';
 const d = new Date(val);
 return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
 };

 const getRowData = (item: any) => {
 const indent = item?.indent ?? item;
 const outhouse =
 item?.outhouseRepair ??
 item?.outhouse ??
 (item?.indent ? item : item?.outhouseRepair) ??
 item;
 const approvedOffer =
 outhouse?.offers?.find((o: any) => o.isApproved) ?? outhouse?.offers?.[0];
 const vendorName =
 approvedOffer?.vendor?.name ||
 approvedOffer?.vendorName ||
 outhouse?.vendorName ||
 indent?.vendorName ||
 'N/A';
 const approvedRate =
 approvedOffer?.rate != null
 ? approvedOffer.rate
 : (indent?.maintenanceCost ?? 0);
 const dispatchDate =
 activeSection === 'pending'
 ? (indent?.approvedAt || indent?.createdAt)
 : (outhouse?.sentAt || outhouse?.dispatch?.sentAt || indent?.updatedAt || indent?.createdAt);
 const transporterName =
 outhouse?.transporterName || outhouse?.dispatch?.transporterName || '—';
 const weighmentSlipNo =
 outhouse?.weighmentSlipNo || outhouse?.dispatch?.weighmentSlipNo || '';

 return {
 indent,
 outhouse,
 approvedOffer,
 vendorName,
 approvedRate,
 dispatchDate,
 transporterName,
 weighmentSlipNo,
 };
 };

 const filterTasks = (list: any[]) => {
 return list.filter((item) => {
 const { indent, vendorName } = getRowData(item);
 const s = searchTerm.toLowerCase();
 return (
 (indent?.indentNumber || '').toLowerCase().includes(s) ||
 (indent?.machineName || '').toLowerCase().includes(s) ||
 vendorName.toLowerCase().includes(s)
 );
 });
 };

 const filteredPending = filterTasks(pendingIndents);
 const filteredHistory = filterTasks(historyItems);

 // Only true when the backend merged this list across companies — absent
 // for every individual company and every single-company session, so this
 // table stays byte-identical to before for them.
 const activeRows = activeSection === 'pending' ? filteredPending : filteredHistory;
 const hasTenantColumn = activeRows.some((item: any) => item.tenant);

 const handleActionClick = (item: any, e: React.MouseEvent) => {
 e.stopPropagation();
 const { indent } = getRowData(item);
 setSelectedIndent(indent);
    setDispatchData({
      transporterName: '',
      vehicleNo: '',
      driverName: '',
      driverContact: '',
      expectedReturnDate: getDefaultExpectedReturnDate(),
      transportationCharges: '',
      weighmentSlipNo: '',
      transportImage: '',
      paymentType: 'Cash',
      paymentAmount: '',
    });
 setIsModalOpen(true);
 };

 const handleRowClick = (item: any) => {
 const { indent, outhouse } = getRowData(item);
 if (indent) {
 setSelectedItemForDetails({ indent, outhouse });
 setIsDetailsModalOpen(true);
 }
 };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setUploading(true);
 try {
 const { uploadUrl, key, publicUrl } = (await getUploadUrl(file.name, 'repair-system')) as any;
 const contentType = file.type || 'application/octet-stream';
 await putFileToS3(uploadUrl, file, contentType);
 setDispatchData((prev) => ({ ...prev, transportImage: publicUrl || key }));
 toast.success('Dispatch receipt uploaded successfully');
 } catch (_error) {
 toast.error('Failed to upload image');
 } finally {
 setUploading(false);
 }
 };

 const handleSubmit = async () => {
 if (!selectedIndent) return;

 if (
 !dispatchData.transporterName ||
 !dispatchData.transportationCharges ||
 !dispatchData.weighmentSlipNo
 ) {
 toast.error('Please fill all required dispatch details');
 return;
 }

 try {
 await recordOuthouseDispatchMutation.mutateAsync({
 id: selectedIndent.id,
 data: {
 transporterName: dispatchData.transporterName,
 vehicleNo: dispatchData.vehicleNo || undefined,
 driverName: dispatchData.driverName || undefined,
 driverContact: dispatchData.driverContact || undefined,
 expectedReturnDate: dispatchData.expectedReturnDate || undefined,
 transportationCharges: parseFloat(dispatchData.transportationCharges),
 weighmentSlipNo: dispatchData.weighmentSlipNo,
 transportImage: dispatchData.transportImage,
 sentPaymentType: dispatchData.paymentType,
 sentPaymentAmount: parseFloat(dispatchData.paymentAmount || '0'),
 },
 actAsTenantId: resolveActAsTenant(selectedIndent.tenant, currentUser?.tenantId),
 });
 setIsModalOpen(false);
 setSelectedIndent(null);
 } catch (_error) {
 // Handled by mutation
 }
 };

 return (
 <div className="h-full flex flex-col space-y-6 max-h-screen overflow-hidden">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-xs">
 <div className="space-y-1">
 <h1 className="text-2xl font-bold tracking-tight">Machine Dispatch</h1>
 <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
 <Truck className="h-4 w-4 text-orange-500" />
 Track machine transit to external service centers
 </p>
 </div>

 <div className="relative w-full md:w-80">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search by ID, machine or vendor..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-9 h-11 border-border shadow-xs"
 />
 </div>
 </div>

 {/* Tabs */}
 <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border w-full sm:w-fit">
 <Button
 variant={activeSection === 'pending' ? 'default' : 'ghost'}
 size="sm"
 onClick={() => setActiveSection('pending')}
 className={cn(
 'rounded-md px-3 sm:px-6 font-bold transition-all',
 activeSection === 'pending' && 'shadow-md'
 )}
 >
 <Clock className="h-4 w-4 mr-2" />
 Pending Dispatch ({pendingIndents.length})
 </Button>
 <Button
 variant={activeSection === 'history' ? 'default' : 'ghost'}
 size="sm"
 onClick={() => setActiveSection('history')}
 className={cn(
 'rounded-md px-3 sm:px-6 font-bold transition-all',
 activeSection === 'history' && 'shadow-md'
 )}
 >
 <History className="h-4 w-4 mr-2" />
 Dispatch History ({historyItems.length})
 </Button>
 </div>

 {/* Content */}
 <div className="flex-1 min-h-0 bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
 {/* Desktop Table */}
 <div className="hidden lg:flex lg:flex-col flex-1 overflow-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
 <Table>
 <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b border-border">
 <TableRow>
 {hasTenantColumn && (
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Company
 </TableHead>
 )}
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Indent No
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Machine & Serial
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Assigned Vendor
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Approved Price
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 {activeSection === 'pending' ? 'Approved On' : 'Dispatch Date'}
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 {activeSection === 'pending' ? 'Problem' : 'Transporter'}
 </TableHead>
 {activeSection === 'pending' && (
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4 text-right pr-6">
 Actions
 </TableHead>
 )}
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoadingPending || isLoadingHistory ? (
 Array.from({ length: 5 }).map((_, idx) => (
 <TableRow key={idx}>
 {Array.from({ length: hasTenantColumn ? 8 : 7 }).map((_, cIdx) => (
 <TableCell key={cIdx} className="py-4">
 <Skeleton className="h-4 w-full" />
 </TableCell>
 ))}
 </TableRow>
 ))
 ) : (activeSection === 'pending' ? filteredPending : filteredHistory).length === 0 ? (
 <TableRow>
 <TableCell colSpan={hasTenantColumn ? 8 : 7} className="h-64 text-center">
 <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
 <Truck className="h-10 w-10 text-muted-foreground" />
 <p className="font-medium">No results found in {activeSection} dispatches</p>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 (activeSection === 'pending' ? filteredPending : filteredHistory).map((item) => {
 const {
 indent,
 outhouse,
 vendorName,
 approvedRate,
 dispatchDate,
 transporterName,
 weighmentSlipNo,
 } = getRowData(item);

 return (
 <TableRow
 key={item.id}
 className="group hover:bg-orange-50/50 transition-colors cursor-pointer"
 onClick={() => handleRowClick(item)}
 >
 {hasTenantColumn && (
 <TableCell>
 {item.tenant ? (
 <Badge variant="outline" className="text-[10px] font-semibold">
 {item.tenant.name}
 </Badge>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 </TableCell>
 )}
 <TableCell className="font-bold text-primary py-4">
 {indent?.indentNumber || '—'}
 </TableCell>
 <TableCell>
 <div className="flex flex-col">
 <span className="font-semibold text-sm">{indent?.machineName || '—'}</span>
 {indent?.machineSerialNo && (
 <span className="text-[10px] text-muted-foreground tabular-nums">
 {indent.machineSerialNo}
 </span>
 )}
 </div>
 </TableCell>
 <TableCell>
 <div className="flex flex-col">
 <span className="font-bold text-indigo-600 text-xs">
 {vendorName}
 </span>
 {outhouse?.vendorType && (
 <Badge
 variant="outline"
 className="text-[9px] py-0 h-4 w-fit bg-violet-50"
 >
 {outhouse.vendorType}
 </Badge>
 )}
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-1 text-blue-700 font-semibold tracking-tight">
 <IndianRupee className="h-3 w-3" />
 {Number(approvedRate).toLocaleString('en-IN')}
 </div>
 </TableCell>
 <TableCell className="text-xs font-semibold tabular-nums">
 {formatDate(dispatchDate)}
 </TableCell>
 <TableCell className="text-xs">
 {activeSection === 'pending' ? (
 <p className="max-w-[150px] truncate" title={indent?.problem}>
 {indent?.problem || '—'}
 </p>
 ) : (
 <div className="flex flex-col">
 <span className="font-bold text-orange-600">
 {transporterName}
 </span>
 {weighmentSlipNo && (
 <span className="text-[10px] text-muted-foreground">
 Slip: {weighmentSlipNo}
 </span>
 )}
 </div>
 )}
 </TableCell>
 {activeSection === 'pending' && (
 <TableCell className="text-right pr-6">
 <Button
 size="sm"
 onClick={(e) => handleActionClick(item, e)}
 className="h-8 px-4 font-bold rounded-lg transition-all shadow-md bg-orange-600 hover:bg-orange-700 text-white"
 >
 <Truck className="h-3.5 w-3.5 mr-1.5" />
 Ship Now
 </Button>
 </TableCell>
 )}
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </div>

 {/* Mobile Cards */}
 <div className="lg:hidden flex-1 overflow-auto p-4 space-y-3">
 {isLoadingPending || isLoadingHistory ? (
 Array.from({ length: 4 }).map((_, idx) => (
 <div key={idx} className="rounded-lg border border-border p-4 space-y-2">
 <Skeleton className="h-4 w-1/2" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-2/3" />
 </div>
 ))
 ) : (activeSection === 'pending' ? filteredPending : filteredHistory).length === 0 ? (
 <div className="flex flex-col items-center justify-center space-y-2 opacity-50 py-16">
 <Truck className="h-10 w-10 text-muted-foreground" />
 <p className="font-medium text-sm text-center">
 No results found in {activeSection} dispatches
 </p>
 </div>
 ) : (
 (activeSection === 'pending' ? filteredPending : filteredHistory).map((item) => {
 const {
 indent,
 outhouse,
 vendorName,
 approvedRate,
 dispatchDate,
 transporterName,
 weighmentSlipNo,
 } = getRowData(item);

 return (
 <div
 key={item.id}
 onClick={() => handleRowClick(item)}
 className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 cursor-pointer active:bg-orange-50/50 transition-colors"
 >
 <div className="flex items-center justify-between gap-2">
 <span className="font-bold text-primary text-sm truncate min-w-0">
 {indent?.indentNumber || '—'}
 </span>
 <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap flex-shrink-0">
 {formatDate(dispatchDate)}
 </span>
 </div>

 <div className="min-w-0">
 <p className="font-semibold text-sm truncate">{indent?.machineName || '—'}</p>
 {indent?.machineSerialNo && (
 <p className="text-[10px] text-muted-foreground tabular-nums truncate">
 {indent.machineSerialNo}
 </p>
 )}
 </div>

 <div className="flex items-center justify-between gap-2">
 <div className="min-w-0">
 <p className="font-bold text-indigo-600 text-xs truncate">
 {vendorName}
 </p>
 {outhouse?.vendorType && (
 <Badge
 variant="outline"
 className="text-[9px] py-0 h-4 w-fit bg-violet-50 mt-0.5"
 >
 {outhouse.vendorType}
 </Badge>
 )}
 </div>
 <div className="flex items-center gap-1 text-blue-700 font-semibold tracking-tight whitespace-nowrap flex-shrink-0">
 <IndianRupee className="h-3 w-3" />
 {Number(approvedRate).toLocaleString('en-IN')}
 </div>
 </div>

 <div className="min-w-0 border-t border-border pt-2">
 {activeSection === 'pending' ? (
 <p className="text-xs truncate" title={indent?.problem}>
 {indent?.problem || '—'}
 </p>
 ) : (
 <div className="min-w-0">
 <p className="font-bold text-orange-600 text-xs truncate">
 {transporterName}
 </p>
 {weighmentSlipNo && (
 <p className="text-[10px] text-muted-foreground truncate">
 Slip: {weighmentSlipNo}
 </p>
 )}
 </div>
 )}
 </div>

 {activeSection === 'pending' && (
 <Button
 size="sm"
 onClick={(e) => handleActionClick(item, e)}
 className="h-8 w-full font-bold rounded-lg transition-all shadow-md bg-orange-600 hover:bg-orange-700 text-white"
 >
 <Truck className="h-3.5 w-3.5 mr-1.5" />
 Ship Now
 </Button>
 )}
 </div>
 );
 })
 )}
 </div>
 </div>

        {/* Dispatch Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="p-6 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 shrink-0">
                  <Truck size={20} />
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
                    Log Machine Dispatch
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Enter transit details for{' '}
                    <span className="text-foreground font-medium">{selectedIndent?.indentNumber}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Destination
                  </Label>
                  <p className="text-sm font-bold truncate text-indigo-700">
                    {selectedIndent?.vendorName}
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Machine
                  </Label>
                  <p className="text-sm font-bold truncate">{selectedIndent?.machineName}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Priority
                  </Label>
                  <p className="text-sm font-bold">{selectedIndent?.priority}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Transporter Name *</Label>
                  <Input
                    placeholder="e.g. VRL Logistics, SafeX, Self Transport"
                    value={dispatchData.transporterName}
                    onChange={(e) =>
                      setDispatchData((prev: any) => ({ ...prev, transporterName: e.target.value }))
                    }
                    className="h-11 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Weighment / LR No. *</Label>
                  <Input
                    placeholder="LR-000000"
                    value={dispatchData.weighmentSlipNo}
                    onChange={(e) =>
                      setDispatchData((prev: any) => ({ ...prev, weighmentSlipNo: e.target.value }))
                    }
                    className="h-11 border-border tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Vehicle / Truck No.</Label>
                  <Input
                    placeholder="e.g. MH-12-AB-1234"
                    value={dispatchData.vehicleNo}
                    onChange={(e) =>
                      setDispatchData((prev: any) => ({ ...prev, vehicleNo: e.target.value }))
                    }
                    className="h-11 border-border uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Driver Name</Label>
                  <Input
                    placeholder="e.g. Ramesh Kumar"
                    value={dispatchData.driverName}
                    onChange={(e) =>
                      setDispatchData((prev: any) => ({ ...prev, driverName: e.target.value }))
                    }
                    className="h-11 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Driver Mobile / Contact</Label>
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={dispatchData.driverContact}
                    onChange={(e) =>
                      setDispatchData((prev: any) => ({ ...prev, driverContact: e.target.value }))
                    }
                    className="h-11 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold flex justify-between items-center">
                    <span>Expected Return Date</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Default: 3 days</span>
                  </Label>
                  <Input
                    type="date"
                    value={dispatchData.expectedReturnDate}
                    onChange={(e) =>
                      setDispatchData((prev: any) => ({ ...prev, expectedReturnDate: e.target.value }))
                    }
                    className="h-11 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Transport Charges (₹) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={dispatchData.transportationCharges}
                      onChange={(e) =>
                        setDispatchData((prev: any) => ({
                          ...prev,
                          transportationCharges: e.target.value,
                        }))
                      }
                      className="pl-8 h-11 border-border tabular-nums"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Proof of Dispatch</Label>
                  <div className="relative">
                    <Input
                      type="file"
                      className="hidden"
                      id="transport-img"
                      onChange={handleFileUpload}
                    />
                    <Label
                      htmlFor="transport-img"
                      className="flex items-center justify-center gap-2 h-11 border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors font-bold text-xs"
                    >
                      {uploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {dispatchData.transportImage ? 'File Attached' : 'Attach LR/Receipt'}
                    </Label>
                  </div>
                  {dispatchData.transportImage && (
                    <p className="text-[10px] text-emerald-600 font-medium truncate">
                      ✓ Uploaded: {dispatchData.transportImage.split('/').pop()}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Immediate Payment (if any)</Label>
                  <Select
                    value={dispatchData.paymentType}
                    onValueChange={(v) =>
                      setDispatchData((prev: any) => ({ ...prev, paymentType: v }))
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI / Digital</SelectItem>
                      <SelectItem value="Postpaid">To Be Billed (Postpaid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Payment Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={dispatchData.paymentAmount}
                    onChange={(e) =>
                      setDispatchData((prev: any) => ({ ...prev, paymentAmount: e.target.value }))
                    }
                    className="h-11 border-border"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/20 border-t border-border gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-semibold">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={recordOuthouseDispatchMutation.isPending || uploading}
                className="px-6 font-semibold bg-orange-600 hover:bg-orange-700 text-white"
              >
                {recordOuthouseDispatchMutation.isPending
                  ? 'Updating Transit...'
                  : 'Confirm Dispatch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="p-6 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 shrink-0">
                  <LayoutDashboard size={20} />
                </div>
                <div className="space-y-0.5 min-w-0 pr-8">
                  <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
                    Dispatch & Transport Audit
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate">
                    {selectedItemForDetails?.indent.indentNumber} •{' '}
                    {selectedItemForDetails?.indent.machineName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                      Machine & Work
                    </h4>
                    <div className="space-y-3">
                      <DetailRow
                        icon={FileText}
                        label="Machine"
                        value={selectedItemForDetails?.indent.machineName}
                      />
                      <DetailRow
                        icon={Info}
                        label="Serial No"
                        value={selectedItemForDetails?.indent.machineSerialNo}
                      />
                      <DetailRow
                        icon={AlertCircle}
                        label="Faulty Part"
                        value={selectedItemForDetails?.indent.machinePartName}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                      Status
                    </h4>
                    <div className="space-y-3">
                      <DetailRow
                        icon={LayoutDashboard}
                        label="Task Status"
                        value={selectedItemForDetails?.indent.taskStatus}
                      />
                      <DetailRow
                        icon={Calendar}
                        label="Last Updated"
                        value={
                          selectedItemForDetails?.indent.updatedAt
                            ? new Date(selectedItemForDetails.indent.updatedAt).toLocaleString()
                            : '-'
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Problem & Context */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                      Context
                    </h4>
                    <div className="space-y-3">
                      <DetailRow
                        icon={User}
                        label="Requester"
                        value={selectedItemForDetails?.indent.doerName}
                      />
                      <DetailRow
                        icon={MapPin}
                        label="Location"
                        value={[
                          selectedItemForDetails?.indent.firmName,
                          selectedItemForDetails?.indent.department,
                          selectedItemForDetails?.indent.location,
                        ]
                          .filter(Boolean)
                          .join(' / ')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                      Problem Description
                    </h4>
                    <div className="p-4 bg-muted/40 border border-border/50 rounded-xl">
                      <p className="text-sm font-normal text-foreground leading-relaxed italic">
                        "{selectedItemForDetails?.indent.problem}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Approved Offer & Transport Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border pt-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                    Approved Vendor & Rate
                  </h4>
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase flex-shrink-0">
                        Vendor Name
                      </span>
                      <Badge className="bg-indigo-600 font-semibold truncate max-w-[160px] min-w-0">
                        {selectedItemForDetails?.outhouse?.offers?.find((o: any) => o.isApproved)
                          ?.vendor?.name || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Approved Rate
                      </span>
                      <p className="text-xl font-bold text-indigo-900 dark:text-indigo-300">
                        ₹
                        {selectedItemForDetails?.outhouse?.offers
                          ?.find((o: any) => o.isApproved)
                          ?.rate?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedItemForDetails?.outhouse?.sentAt && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                      Transport Details
                    </h4>
                    <div className="bg-orange-50/50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 space-y-2">
                      <DetailRow
                        icon={Truck}
                        label="Transporter"
                        value={selectedItemForDetails.outhouse.transporterName}
                      />
                      {selectedItemForDetails.outhouse.vehicleNo && (
                        <DetailRow
                          icon={Truck}
                          label="Vehicle No"
                          value={selectedItemForDetails.outhouse.vehicleNo}
                        />
                      )}
                      {selectedItemForDetails.outhouse.driverName && (
                        <DetailRow
                          icon={User}
                          label="Driver Name"
                          value={selectedItemForDetails.outhouse.driverName}
                        />
                      )}
                      {selectedItemForDetails.outhouse.driverContact && (
                        <DetailRow
                          icon={Phone}
                          label="Driver Mobile"
                          value={selectedItemForDetails.outhouse.driverContact}
                        />
                      )}
                      <DetailRow
                        icon={FileText}
                        label="LR / Slip No"
                        value={selectedItemForDetails.outhouse.weighmentSlipNo}
                      />
                      <DetailRow
                        icon={IndianRupee}
                        label="Freight"
                        value={`₹${selectedItemForDetails.outhouse.transportationCharges?.toLocaleString()}`}
                      />
                      <DetailRow
                        icon={Calendar}
                        label="Sent On"
                        value={new Date(selectedItemForDetails.outhouse.sentAt).toLocaleString()}
                      />
                      {selectedItemForDetails.outhouse.expectedReturnDate && (
                        <DetailRow
                          icon={Calendar}
                          label="Expected Return"
                          value={new Date(selectedItemForDetails.outhouse.expectedReturnDate).toLocaleDateString('en-IN')}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-6 bg-muted/20 border-t border-border">
              <Button
                variant="default"
                onClick={() => setIsDetailsModalOpen(false)}
                className="bg-orange-600 hover:bg-orange-700 font-semibold"
              >
                Done Auditing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
 </div>
 );
};

function DetailRow({
 icon: Icon,
 label,
 value,
}: {
 icon: any;
 label: string;
 value?: string | number;
}) {
 return (
 <div className="flex items-center justify-between p-1.5">
 <div className="flex items-center gap-2 text-muted-foreground">
 <Icon className="h-3.5 w-3.5" />
 <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
 </div>
 <span className="text-sm font-bold text-foreground text-right max-w-[150px] truncate">
 {value || '-'}
 </span>
 </div>
 );
}

export default SentMachinePage;
