'use client';

import axios from 'axios';
import {
 AlertCircle,
 Calendar,
 CheckCircle2,
 Clock,
 FileText,
 FolderInput,
 History,
 Loader2,
 Search,
 Truck,
 Upload,
 User,
 UserCheck,
 Wrench,
 X,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
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

const StoreInPage = () => {
 const currentUser = useAppSelector(selectUser);
  const {
    usePendingOuthouseStoreIn,
    useOuthouseStoreInHistory,
    recordOuthouseReceivingMutation,
    getUploadUrl,
  } = useRepairSystem();

  const { effectivePermittedFirms } = useProject();
  const { data: rawPendingIndents = [], isLoading: isLoadingPending } = usePendingOuthouseStoreIn();
  const { data: rawHistoryItems = [], isLoading: isLoadingHistory } = useOuthouseStoreInHistory();

  const pendingIndents = useMemo(() => {
    return filterByFirmAccess(rawPendingIndents, effectivePermittedFirms);
  }, [rawPendingIndents, effectivePermittedFirms]);

  const historyItems = useMemo(() => {
    return filterByFirmAccess(rawHistoryItems, effectivePermittedFirms);
  }, [rawHistoryItems, effectivePermittedFirms]);

 const [activeSection, setActiveSection] = useState<'pending' | 'history'>('pending');
 const [searchTerm, setSearchTerm] = useState('');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedIndent, setSelectedIndent] = useState<any>(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedDetailIndent, setSelectedDetailIndent] = useState<any>(null);

 // Form State
 const [storeInData, setStoreInData] = useState({
 inspectedBy: '',
 inspectionResult: '',
 returnTransporterName: '',
 transportationAmount: '',
 billImage: '',
 billNo: '',
 typeOfBill: 'Service',
 totalBillAmount: '',
 toBePaidAmount: '',
 });

 const [uploading, setUploading] = useState(false);

  const formatDate = (val?: string | null) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
  };

  const getRelativeDaysText = (targetDate: Date | null) => {
    if (!targetDate) return '';
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return `in ${diffDays} days`;
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === 0) return 'Due today';
    if (diffDays === -1) return 'Overdue by 1 day';
    return `Overdue by ${Math.abs(diffDays)} days`;
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
    const approvedVendor =
      approvedOffer?.vendor?.name ||
      approvedOffer?.vendorName ||
      outhouse?.vendorName ||
      indent?.vendorName ||
      'Service Center';

    const rawExpectedReturn =
      outhouse?.expectedReturnDate ||
      outhouse?.dispatch?.expectedReturnDate ||
      (item as any)?.expectedReturnDate;

    const dispatchedDate = outhouse?.sentAt || outhouse?.dispatch?.sentAt || null;
    const deliveryDays = Number(indent?.expectedDeliveryDays) || 3;

    const expectedDate = rawExpectedReturn
      ? new Date(rawExpectedReturn)
      : dispatchedDate
        ? new Date(new Date(dispatchedDate).getTime() + deliveryDays * 24 * 60 * 60 * 1000)
        : indent?.createdAt
          ? new Date(new Date(indent.createdAt).getTime() + deliveryDays * 24 * 60 * 60 * 1000)
          : null;
    const transporterName =
      outhouse?.transporterName || outhouse?.dispatch?.transporterName || '—';
    const inspectedBy =
      outhouse?.inspectedBy || outhouse?.receiving?.inspectedBy?.name || '—';
    const receivedAt =
      outhouse?.receivedAt || outhouse?.receiving?.receivedAt || null;

    return {
      indent,
      outhouse,
      approvedOffer,
      approvedVendor,
      expectedDate,
      dispatchedDate,
      transporterName,
      inspectedBy,
      receivedAt,
    };
  };

  const filterTasks = (list: any[]) => {
    return list.filter((item) => {
      const { indent, approvedVendor } = getRowData(item);
      const s = searchTerm.toLowerCase();
      return (
        (indent?.indentNumber || '').toLowerCase().includes(s) ||
        (indent?.machineName || '').toLowerCase().includes(s) ||
        approvedVendor.toLowerCase().includes(s)
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
    const { indent, outhouse } = getRowData(item);
    setSelectedIndent(indent);
    setStoreInData({
      inspectedBy: '',
      inspectionResult: '',
      returnTransporterName: outhouse?.transporterName || '',
      transportationAmount: '',
      billImage: '',
      billNo: '',
      typeOfBill: 'Service',
      totalBillAmount: '',
      toBePaidAmount: '',
    });
    setIsModalOpen(true);
  };

  const handleRowClick = (item: any) => {
    const { indent } = getRowData(item);
    setSelectedDetailIndent(indent);
    setIsDetailModalOpen(true);
  };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setUploading(true);
 try {
 const { uploadUrl, key, publicUrl } = (await getUploadUrl(file.name, 'repair-system')) as any;
 const contentType = file.type || 'application/octet-stream';
 await putFileToS3(uploadUrl, file, contentType);
 setStoreInData((prev) => ({ ...prev, billImage: publicUrl || key }));
 toast.success('Vendor bill uploaded successfully');
 } catch (_error) {
 toast.error('Failed to upload bill image');
 } finally {
 setUploading(false);
 }
 };

 const handleSubmit = async () => {
 if (!selectedIndent) return;

 if (!storeInData.inspectedBy || !storeInData.billNo || !storeInData.totalBillAmount) {
 toast.error('Please fill all required store-in fields');
 return;
 }

 try {
 await recordOuthouseReceivingMutation.mutateAsync({
 id: selectedIndent.id,
 data: {
 inspectedBy: storeInData.inspectedBy,
 inspectionResult: storeInData.inspectionResult,
 returnTransporterName: storeInData.returnTransporterName,
 returnTransportAmount: parseFloat(storeInData.transportationAmount || '0'),
 billImage: storeInData.billImage,
 billNo: storeInData.billNo,
 typeOfBill: storeInData.typeOfBill,
 totalBillAmount: parseFloat(storeInData.totalBillAmount),
 toBePaidAmount: parseFloat(storeInData.toBePaidAmount || storeInData.totalBillAmount),
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
 <h1 className="text-2xl font-bold tracking-tight text-indigo-950">
 Store In Verification
 </h1>
 <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
 <FolderInput className="h-4 w-4 text-indigo-600" />
 Receive returned machines and verify repair quality
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
 <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border w-fit max-w-full">
 <Button
 variant={activeSection === 'pending' ? 'default' : 'ghost'}
 size="sm"
 onClick={() => setActiveSection('pending')}
 className={cn(
 'rounded-md px-6 font-bold transition-all',
 activeSection === 'pending' && 'shadow-md'
 )}
 >
 <Clock className="h-4 w-4 mr-2" />
 Pending Store-In ({pendingIndents.length})
 </Button>
 <Button
 variant={activeSection === 'history' ? 'default' : 'ghost'}
 size="sm"
 onClick={() => setActiveSection('history')}
 className={cn(
 'rounded-md px-6 font-bold transition-all',
 activeSection === 'history' && 'shadow-md'
 )}
 >
 <History className="h-4 w-4 mr-2" />
 Store-In History ({historyItems.length})
 </Button>
 </div>

 {/* Content */}
 <div className="flex-1 min-h-0 bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
 <div className="flex-1 overflow-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
 {/* Desktop Table */}
 <div className="hidden lg:block overflow-x-auto">
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
 Return Vendor
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Dispatch Stats
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 {activeSection === 'pending' ? 'Expected Date' : 'Inspected By'}
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Status
 </TableHead>
 {activeSection === 'pending' && (
 <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider py-4">
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
 ) : (activeSection === 'pending' ? filteredPending : filteredHistory).length ===
 0 ? (
 <TableRow>
 <TableCell colSpan={hasTenantColumn ? 8 : 7} className="h-64 text-center">
 <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
 <FolderInput className="h-10 w-10 text-muted-foreground" />
 <p className="font-medium">No {activeSection} store-in records</p>
 </div>
 </TableCell>
 </TableRow>
 ) : (
   (activeSection === 'pending' ? filteredPending : filteredHistory).map((item) => {
     const {
       indent,
       outhouse,
       approvedVendor,
       expectedDate,
       dispatchedDate,
       transporterName,
       inspectedBy,
       receivedAt,
     } = getRowData(item);

     return (
       <TableRow
         key={item.id}
         className="group hover:bg-muted/30 transition-colors cursor-pointer"
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
               {approvedVendor}
             </span>
             <span className="text-[10px] text-muted-foreground">
               Type: {outhouse?.vendorType || 'Outhouse'}
             </span>
           </div>
         </TableCell>
         <TableCell>
           <div className="flex flex-col gap-1">
             <Badge
               variant="outline"
               className="text-[9px] py-0 h-4 bg-orange-50 text-orange-700 w-fit"
             >
               Dispatched: {formatDate(dispatchedDate)}
             </Badge>
             <span className="text-[9px] font-bold text-muted-foreground uppercase">
               {transporterName}
             </span>
           </div>
         </TableCell>
         <TableCell className="text-xs">
           {activeSection === 'pending' ? (
             expectedDate ? (
               <div className="flex flex-col">
                 <span className="font-bold text-orange-600">
                   {formatDate(expectedDate.toISOString())}
                 </span>
                 <span className="text-[10px] text-muted-foreground font-medium">
                   {getRelativeDaysText(expectedDate)}
                 </span>
               </div>
             ) : (
               <span className="font-bold text-red-600">Not set</span>
             )
           ) : (
             <div className="flex flex-col">
               <span className="font-bold text-emerald-600">
                 {inspectedBy}
               </span>
               <span className="text-[10px] text-muted-foreground">
                 Received on {formatDate(receivedAt)}
               </span>
             </div>
           )}
         </TableCell>
         <TableCell>
           <Badge
             variant="outline"
             className={cn(
               'font-bold uppercase text-[10px]',
               activeSection === 'pending'
                 ? 'bg-amber-50 text-amber-700 border-amber-200'
                 : 'bg-emerald-50 text-emerald-700 border-emerald-200'
             )}
           >
             {indent?.taskStatus || 'UNKNOWN'}
           </Badge>
         </TableCell>
         {activeSection === 'pending' && (
           <TableCell className="text-right">
             <Button
               size="sm"
               onClick={(e) => handleActionClick(item, e)}
               className="h-8 px-4 font-bold rounded-lg transition-all shadow-md bg-indigo-600 hover:bg-indigo-700 text-white"
             >
               <FolderInput className="h-3.5 w-3.5 mr-1.5" />
               Record Store-In
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
 <div className="lg:hidden space-y-4 p-4">
 {isLoadingPending || isLoadingHistory ? (
 Array.from({ length: 5 }).map((_, idx) => (
 <div key={idx} className="rounded-lg border border-border p-4 space-y-3">
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-3/4" />
 <Skeleton className="h-4 w-1/2" />
 </div>
 ))
 ) : (activeSection === 'pending' ? filteredPending : filteredHistory).length === 0 ? (
 <div className="flex flex-col items-center justify-center space-y-2 opacity-50 py-12">
 <FolderInput className="h-10 w-10 text-muted-foreground" />
 <p className="font-medium text-sm">No {activeSection} store-in records</p>
 </div>
 ) : (
 (activeSection === 'pending' ? filteredPending : filteredHistory).map((item) => {
 const {
 indent,
 outhouse,
 approvedVendor,
 expectedDate,
 dispatchedDate,
 transporterName,
 inspectedBy,
 receivedAt,
 } = getRowData(item);

 return (
 <div
 key={item.id}
 className="rounded-lg border border-border p-4 space-y-3 bg-muted/10 active:bg-muted/30 transition-colors"
 onClick={() => handleRowClick(item)}
 >
 <div className="flex items-center justify-between gap-2">
 <span className="font-bold text-primary text-sm truncate min-w-0">
 {indent?.indentNumber || '—'}
 </span>
 <Badge
 variant="outline"
 className={cn(
 'font-bold uppercase text-[10px] shrink-0',
 activeSection === 'pending'
 ? 'bg-amber-50 text-amber-700 border-amber-200'
 : 'bg-emerald-50 text-emerald-700 border-emerald-200'
 )}
 >
 {indent?.taskStatus || 'UNKNOWN'}
 </Badge>
 </div>

 <div className="min-w-0">
 <p className="font-semibold text-sm truncate">{indent?.machineName || '—'}</p>
 {indent?.machineSerialNo && (
 <p className="text-[10px] text-muted-foreground tabular-nums truncate">
 {indent.machineSerialNo}
 </p>
 )}
 </div>

 <div className="min-w-0">
 <p className="font-bold text-indigo-600 text-xs truncate">{approvedVendor}</p>
 <p className="text-[10px] text-muted-foreground truncate">
 Type: {outhouse?.vendorType || 'Outhouse'}
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-1.5">
 <Badge
 variant="outline"
 className="text-[9px] py-0 h-4 bg-orange-50 text-orange-700 w-fit"
 >
 Dispatched: {formatDate(dispatchedDate)}
 </Badge>
 <span className="text-[9px] font-bold text-muted-foreground uppercase truncate min-w-0">
 {transporterName}
 </span>
 </div>

 <div className="text-xs min-w-0">
 {activeSection === 'pending' ? (
 expectedDate ? (
 <div className="flex flex-col">
 <span className="font-bold text-orange-600">
 {formatDate(expectedDate.toISOString())}
 </span>
 <span className="text-[10px] text-muted-foreground font-medium">
 {getRelativeDaysText(expectedDate)}
 </span>
 </div>
 ) : (
 <span className="font-bold text-red-600">Not set</span>
 )
 ) : (
 <div className="flex flex-col">
 <span className="font-bold text-emerald-600">
 {inspectedBy}
 </span>
 <span className="text-[10px] text-muted-foreground">
 Received on {formatDate(receivedAt)}
 </span>
 </div>
 )}
 </div>

 {activeSection === 'pending' && (
 <Button
 size="sm"
 onClick={(e) => handleActionClick(item, e)}
 className="w-full h-9 font-bold rounded-lg transition-all shadow-md bg-indigo-600 hover:bg-indigo-700 text-white"
 >
 <FolderInput className="h-3.5 w-3.5 mr-1.5" />
 Record Store-In
 </Button>
 )}
 </div>
 );
 })
 )}
 </div>
 </div>
 </div>

 {/* Store In Modal */}
 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
 <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
 <DialogHeader className="p-6 border-b border-border text-left">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
 <FolderInput size={20} />
 </div>
 <div className="space-y-0.5">
 <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
 Receive Repaired Machine
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Verify repair status and log incoming billing for{' '}
 <span className="text-foreground font-medium">{selectedIndent?.indentNumber}</span>
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 <div className="p-6 space-y-6">
 <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div>
 <Label className="text-[10px] uppercase font-bold text-muted-foreground">
 Machine
 </Label>
 <p className="text-sm font-bold truncate">{selectedIndent?.machineName}</p>
 </div>
 <div>
 <Label className="text-[10px] uppercase font-bold text-muted-foreground">
 Serial No
 </Label>
 <p className="text-sm font-bold truncate tabular-nums">
 {selectedIndent?.machineSerialNo}
 </p>
 </div>
 <div>
 <Label className="text-[10px] uppercase font-bold text-muted-foreground">
 Assigned Vendor
 </Label>
 <p className="text-sm font-bold truncate text-indigo-700">
 {selectedIndent?.vendorName}
 </p>
 </div>
 <div>
 <Label className="text-[10px] uppercase font-bold text-muted-foreground">
 Indent Number
 </Label>
 <p className="text-sm font-bold text-primary">{selectedIndent?.indentNumber}</p>
 </div>
 </div>

 <div className="space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <UserCheck className="h-3.5 w-3.5" /> Inspection & Return Transit
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-sm font-bold">Inspected By *</Label>
 <Input
 placeholder="Name of engineer who verified repair"
 value={storeInData.inspectedBy}
 onChange={(e) =>
 setStoreInData((prev: any) => ({ ...prev, inspectedBy: e.target.value }))
 }
 className="h-10 border-border"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-sm font-bold">Return Transporter *</Label>
                  <Input
                    placeholder="e.g. VRL Logistics, SafeX, Self Transport"
                    value={storeInData.returnTransporterName}
                    onChange={(e) =>
                      setStoreInData((prev: any) => ({
                        ...prev,
                        returnTransporterName: e.target.value,
                      }))
                    }
                    className="h-10 border-border"
                  />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-sm font-bold flex justify-between">
 Return Transport Cost (₹)
 <span className="text-[10px] font-medium text-orange-600">Company Expense</span>
 </Label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
 ₹
 </span>
 <Input
 type="number"
 placeholder="0.00"
 value={storeInData.transportationAmount}
 onChange={(e) =>
 setStoreInData((prev: any) => ({
 ...prev,
 transportationAmount: e.target.value,
 }))
 }
 className="h-10 pl-7 border-border"
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label className="text-sm font-bold">Inspection Remarks</Label>
 <Input
 placeholder="e.g. Machine working smoothly"
 value={storeInData.inspectionResult}
 onChange={(e) =>
 setStoreInData((prev: any) => ({ ...prev, inspectionResult: e.target.value }))
 }
 className="h-10 border-border"
 />
 </div>
 </div>
 </div>

 <div className="space-y-4 pt-2">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <FileText className="h-3.5 w-3.5" /> Vendor Billing Details
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label className="text-sm font-bold">Bill/Invoice Number *</Label>
 <Input
 placeholder="INV-0000"
 value={storeInData.billNo}
 onChange={(e) =>
 setStoreInData((prev: any) => ({ ...prev, billNo: e.target.value }))
 }
 className="h-10 border-border font-mono text-xs uppercase"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-sm font-bold">Type of Bill</Label>
 <Select
 value={storeInData.typeOfBill}
 onValueChange={(v) =>
 setStoreInData((prev: any) => ({ ...prev, typeOfBill: v }))
 }
 >
 <SelectTrigger className="h-10">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Service">Service Charge</SelectItem>
 <SelectItem value="Part Replacement">Part Replacement</SelectItem>
 <SelectItem value="Annual Maintenance">AMC Repair</SelectItem>
 <SelectItem value="Other">Other</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label className="text-sm font-bold">Attach Bill Proof</Label>
 <div className="relative">
 <Input
 type="file"
 className="hidden"
 id="bill-img"
 onChange={handleFileUpload}
 />
 <Label
 htmlFor="bill-img"
 className="flex items-center justify-center gap-2 h-10 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors font-bold text-[10px]"
 >
 {uploading ? (
 <Loader2 className="h-3 w-3 animate-spin" />
 ) : (
 <Upload className="h-3 w-3" />
 )}
 {storeInData.billImage ? 'Bill Attached' : 'Upload Invoice'}
 </Label>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-sm font-bold">Total Bill Amount (₹) *</Label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
 ₹
 </span>
 <Input
 type="number"
 placeholder="0.00"
 value={storeInData.totalBillAmount}
 onChange={(e) =>
 setStoreInData((prev: any) => ({
 ...prev,
 totalBillAmount: e.target.value,
 }))
 }
 className="h-10 pl-7 border-border font-bold text-indigo-600"
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label className="text-sm font-bold flex justify-between">
 Final Payable Amount (₹)
 <span className="text-[10px] font-medium text-blue-600">Post-negotiation</span>
 </Label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
 ₹
 </span>
 <Input
 type="number"
 placeholder={storeInData.totalBillAmount || '0.00'}
 value={storeInData.toBePaidAmount}
 onChange={(e) =>
 setStoreInData((prev: any) => ({ ...prev, toBePaidAmount: e.target.value }))
 }
 className="h-10 pl-7 border-border font-bold text-emerald-600"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 mb-2">
 <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
 <div className="space-y-0.5">
 <p className="text-sm font-bold text-emerald-950 dark:text-emerald-300 uppercase tracking-tight leading-none">
 Ready for Settlement
 </p>
 <p className="text-[10px] text-muted-foreground">
 Submitting will move this indent to the final payment queue.
 </p>
 </div>
 </div>
 </div>

 <DialogFooter className="p-6 bg-muted/20 border-t border-border gap-3">
 <Button
 variant="ghost"
 onClick={() => setIsModalOpen(false)}
 className="font-medium px-6"
 >
 Cancel
 </Button>
 <Button
 onClick={handleSubmit}
 disabled={recordOuthouseReceivingMutation.isPending || uploading}
 className="px-6 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
 >
 {recordOuthouseReceivingMutation.isPending
 ? 'Processing...'
 : 'Confirm Received & Log Bill'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Detail View Modal */}
 <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
 <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
 <DialogHeader className="p-6 border-b border-border text-left">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
 <FolderInput size={20} />
 </div>
 <div className="space-y-0.5 min-w-0 pr-8">
 <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
 Store-In Audit Details
 </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate">
                    {(() => {
                      const { indent } = getRowData(selectedDetailIndent);
                      return `${indent?.indentNumber || '—'} • ${indent?.machineName || '—'}`;
                    })()}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {(() => {
              const {
                indent,
                outhouse,
                approvedOffer,
                approvedVendor,
                expectedDate,
                dispatchedDate,
                transporterName,
                inspectedBy,
                receivedAt,
              } = getRowData(selectedDetailIndent);

              return (
 <div className="p-6 space-y-6">
 {/* Machine & Indent Info */}
 <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 grid grid-cols-1 sm:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div className="space-y-1">
 <Label className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
 <Wrench className="h-3 w-3" /> Machine & Part
 </Label>
 <p className="text-sm font-bold text-foreground">{indent?.machineName || '—'}</p>
 {indent?.machineSerialNo && (
 <p className="text-[11px] font-mono font-bold text-indigo-600/70">
 {indent.machineSerialNo}
 </p>
 )}
 <Badge
 variant="outline"
 className="text-[9px] mt-1 bg-background border-border font-bold"
 >
 {indent?.machinePartName || 'N/A'}
 </Badge>
 </div>
 <div className="space-y-1">
 <Label className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
 <User className="h-3 w-3" /> Indent Origin
 </Label>
 <p className="text-sm font-bold">{indent?.doerName || '—'}</p>
 <p className="text-[10px] text-muted-foreground">
 {indent?.firmName ? `${indent.firmName} • ` : ''}{indent?.department || '—'} • {indent?.location || '—'}
 </p>
 </div>
 </div>
 <div className="space-y-4 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-indigo-100 dark:border-indigo-900/30 sm:pl-6">
 <div className="space-y-1">
 <Label className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
 <Calendar className="h-3 w-3" /> Timeline
 </Label>
 <div className="space-y-2">
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground font-medium">Indent Created:</span>
 <span className="font-bold tabular-nums">
 {formatDate(indent?.createdAt)}
 </span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground font-medium">
 Expected Delivery:
 </span>
 <span className="font-bold tabular-nums text-orange-600">
 {expectedDate ? formatDate(expectedDate.toISOString()) : '-'}
 {expectedDate && (
 <span className="text-[11px] font-normal text-muted-foreground ml-1">
 ({getRelativeDaysText(expectedDate)})
 </span>
 )}
 </span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground font-medium">Priority:</span>
 <Badge
 variant={indent?.priority === 'High' ? 'destructive' : 'secondary'}
 className="text-[9px] font-bold"
 >
 {indent?.priority || 'Normal'}
 </Badge>
 </div>
 </div>
 </div>
 <div className="space-y-1">
 <Label className="text-[10px] uppercase font-semibold text-indigo-900/40">
 Current Status
 </Label>
 <Badge className="bg-indigo-600 text-white font-bold uppercase text-[10px]">
 {indent?.taskStatus || 'UNKNOWN'}
 </Badge>
 </div>
 </div>
 </div>

 {/* Problem Description */}
 <div className="space-y-2">
 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center gap-2">
 <AlertCircle className="h-3.5 w-3.5" /> Problem Description
 </h4>
 <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl">
 <p className="text-sm font-semibold text-red-900 leading-relaxed italic">
 "{indent?.problem || 'No description provided'}"
 </p>
 </div>
 </div>

 {/* Approved Vendor & Dispatch Info */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
 <div className="space-y-3">
 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center gap-2">
 <CheckCircle2 className="h-3.5 w-3.5" /> Approved Service Vendor
 </h4>
 <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
 <p className="text-sm font-semibold text-emerald-900">
 {approvedVendor}
 </p>
 <Badge
 variant="outline"
 className="text-[9px] bg-white border-emerald-200 font-bold"
 >
 {outhouse?.vendorType || 'Outhouse'}
 </Badge>
 {approvedOffer && (
 <div className="pt-2 border-t border-emerald-100">
 <div className="flex justify-between text-xs">
 <span className="font-medium text-emerald-700">Approved Rate:</span>
 <span className="font-semibold text-emerald-900">
 ₹{approvedOffer.rate?.toLocaleString() || '0'}
 </span>
 </div>
 {approvedOffer.paymentTerm && (
 <div className="flex justify-between text-xs mt-1">
 <span className="font-medium text-emerald-700">Payment Terms:</span>
 <span className="font-bold text-emerald-800">
 {approvedOffer.paymentTerm}
 </span>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 <div className="space-y-3">
 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center gap-2">
 <Truck className="h-3.5 w-3.5" /> Dispatch & Transit
 </h4>
 <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2">
 <div className="flex justify-between text-xs">
 <span className="font-medium text-orange-700">Sent On:</span>
 <span className="font-bold tabular-nums">
 {dispatchedDate ? formatDate(dispatchedDate) : 'Not dispatched'}
 </span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="font-medium text-orange-700">Outgoing Transporter:</span>
 <span className="font-bold">{transporterName}</span>
 </div>
 {outhouse?.vehicleNo && (
 <div className="flex justify-between text-xs">
 <span className="font-medium text-orange-700">Vehicle No:</span>
 <span className="font-bold">{outhouse.vehicleNo}</span>
 </div>
 )}
 {outhouse?.driverName && (
 <div className="flex justify-between text-xs">
 <span className="font-medium text-orange-700">Driver:</span>
 <span className="font-bold">
 {outhouse.driverName}
 {outhouse.driverContact ? ` (${outhouse.driverContact})` : ''}
 </span>
 </div>
 )}
 {outhouse?.transportationCharges > 0 && (
 <div className="flex justify-between text-xs">
 <span className="font-medium text-orange-700">Outgoing Cost:</span>
 <span className="font-bold">
 ₹{outhouse.transportationCharges?.toLocaleString()}
 </span>
 </div>
 )}
 {outhouse?.weighmentSlipNo && (
 <div className="flex justify-between text-xs">
 <span className="font-medium text-orange-700">Weighment Slip:</span>
 <span className="font-bold font-mono">{outhouse.weighmentSlipNo}</span>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Receipt & Billing */}
 {(receivedAt || outhouse?.billNo || activeSection === 'history') && (
 <>
 <div className="space-y-3">
 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center gap-2">
 <UserCheck className="h-3.5 w-3.5" /> Receipt & Inspection
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="p-3 bg-muted/30 rounded-lg border border-border">
 <Label className="text-[9px] font-bold text-muted-foreground uppercase">
 Inspected By
 </Label>
 <p className="text-sm font-bold text-slate-800">
 {inspectedBy}
 </p>
 </div>
 <div className="p-3 bg-muted/30 rounded-lg border border-border">
 <Label className="text-[9px] font-bold text-muted-foreground uppercase">
 Received On
 </Label>
 <p className="text-sm font-bold text-slate-800">
 {formatDate(receivedAt)}
 </p>
 </div>
 <div className="p-3 bg-muted/30 rounded-lg border border-border">
 <Label className="text-[9px] font-bold text-muted-foreground uppercase">
 Return Transport
 </Label>
 <p className="text-sm font-bold text-slate-800">
 {outhouse?.returnTransporterName || '—'}
 </p>
 {outhouse?.returnTransportAmount > 0 && (
 <p className="text-[10px] font-bold text-orange-600">
 Cost: ₹{outhouse.returnTransportAmount?.toLocaleString()}
 </p>
 )}
 </div>
 </div>
 </div>

 <div className="space-y-3">
 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center gap-2">
 <FileText className="h-3.5 w-3.5" /> Billing Information
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="p-3 bg-muted/30 rounded-lg border border-border">
 <Label className="text-[9px] font-bold text-muted-foreground uppercase">
 Invoice Number
 </Label>
 <p className="text-sm font-semibold text-slate-800 font-mono italic">
 {outhouse?.billNo || 'Pending'}
 </p>
 </div>
 <div className="p-3 bg-muted/30 rounded-lg border border-border">
 <Label className="text-[9px] font-bold text-muted-foreground uppercase">
 Bill Type
 </Label>
 <p className="text-xs font-bold text-indigo-600 uppercase">
 {outhouse?.typeOfBill || 'N/A'}
 </p>
 </div>
 <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
 <Label className="text-[9px] font-bold text-blue-700 uppercase">
 Payable Amount
 </Label>
 <p className="text-sm font-semibold text-blue-900">
 ₹{(outhouse?.toBePaidAmount ?? 0).toLocaleString()}
 </p>
 </div>
 </div>
 </div>
 </>
 )}

 {/* Inspection Remarks */}
 {outhouse?.inspectionResult && (
 <div className="space-y-2">
 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
 Inspection Remarks
 </h4>
 <div className="p-4 bg-muted/20 border border-border rounded-xl">
 <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
 "{outhouse.inspectionResult}"
 </p>
 </div>
 </div>
 )}
 </div>
 );
 })()}

 <DialogFooter className="p-4 sm:p-6 bg-muted/20 border-t border-border mt-0">
 <Button
 variant="default"
 onClick={() => setIsDetailModalOpen(false)}
 className="bg-indigo-600 hover:bg-indigo-700 font-semibold"
 >
 Done Auditing
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
};

export default StoreInPage;
