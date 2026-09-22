'use client';

import {
 AlertCircle,
 Clock,
 CreditCard,
 DollarSign,
 History,
 IndianRupee,
 Scale,
 Search,
 ShieldCheck,
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
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useRepairSystem } from '../../server/tanstackQuery/useRepairSystem';

const PaymentPage = () => {
 const currentUser = useAppSelector(selectUser);
 const { usePendingOuthousePayment, useOuthousePaymentHistory, completeOuthousePaymentMutation } =
 useRepairSystem();

 const { data: pendingIndents = [], isLoading: isLoadingPending } = usePendingOuthousePayment();
 const { data: historyIndents = [], isLoading: isLoadingHistory } = useOuthousePaymentHistory();

 const [activeSection, setActiveSection] = useState<'pending' | 'history'>('pending');
 const [searchTerm, setSearchTerm] = useState('');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedIndent, setSelectedIndent] = useState<any>(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedDetailIndent, setSelectedDetailIndent] = useState<any>(null);

 // Form State
 const [paymentData, setPaymentData] = useState({
 billMatch: 'Yes',
 billStatus: 'Cleared',
 finalPaymentAmount: '',
 });

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
 const vendorType = outhouse?.vendorType || indent?.vendorType || 'Outhouse';
 const billNo = outhouse?.billNo || outhouse?.receiving?.billNo || 'N/A';
 const typeOfBill = outhouse?.typeOfBill || outhouse?.receiving?.typeOfBill || 'N/A';
 const inspectedBy =
 outhouse?.inspectedBy || outhouse?.receiving?.inspectedBy?.name || '—';
 const amount =
 (activeSection === 'pending'
 ? outhouse?.toBePaidAmount ?? outhouse?.receiving?.toBePaidAmount
 : outhouse?.finalPaymentAmount ?? outhouse?.payment?.finalPaymentAmount ?? outhouse?.toBePaidAmount) ?? 0;

 return {
 indent,
 outhouse,
 approvedOffer,
 vendorName,
 vendorType,
 billNo,
 typeOfBill,
 inspectedBy,
 amount,
 };
 };

 const filterTasks = (list: any[]) => {
 if (!searchTerm.trim()) return list;
 const term = searchTerm.toLowerCase();
 return list.filter((item) => {
 const { indent, vendorName, billNo } = getRowData(item);
 return (
 (indent?.indentNumber || '').toLowerCase().includes(term) ||
 (indent?.machineName || '').toLowerCase().includes(term) ||
 (vendorName || '').toLowerCase().includes(term) ||
 (billNo || '').toLowerCase().includes(term)
 );
 });
 };

 const filteredPending = filterTasks(pendingIndents);
 const filteredHistory = filterTasks(historyIndents);

 // Only true when the backend merged this list across companies — absent
 // for every individual company and every single-company session, so this
 // table stays byte-identical to before for them.
 const activeRows = activeSection === 'pending' ? filteredPending : filteredHistory;
 const hasTenantColumn = activeRows.some((item: any) => item.tenant);

 const handleActionClick = (item: any, e: React.MouseEvent) => {
 e.stopPropagation();
 const { indent, outhouse } = getRowData(item);
 setSelectedIndent({ ...indent, outhouseRepair: outhouse });
 const finalAmount =
 outhouse?.toBePaidAmount ?? outhouse?.receiving?.toBePaidAmount ?? outhouse?.totalBillAmount;
 setPaymentData({
 billMatch: 'Yes',
 billStatus: 'Cleared',
 finalPaymentAmount: finalAmount ? String(finalAmount) : '',
 });
 setIsModalOpen(true);
 };

 const handleRowClick = (item: any) => {
 // Pass the full item so modal can access outhouse + indent data
 setSelectedDetailIndent(item);
 setIsDetailModalOpen(true);
 };

 const handleSubmit = async () => {
 if (!selectedIndent) return;

 if (!paymentData.finalPaymentAmount) {
 toast.error('Please enter the final payment amount');
 return;
 }

 try {
 await completeOuthousePaymentMutation.mutateAsync({
 id: selectedIndent.id,
 data: {
 ...paymentData,
 finalPaymentAmount: parseFloat(paymentData.finalPaymentAmount),
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
 <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vendor Settlement</h1>
 <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
 <DollarSign className="h-4 w-4 text-emerald-600" />
 Finalize vendor invoices and process repair payments
 </p>
 </div>

 <div className="relative w-full md:w-80">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search by ID, bill or vendor..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-9 h-11 border-border shadow-xs"
 />
 </div>
 </div>

 {/* Tabs */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border w-full sm:w-fit">
 <Button
 variant={activeSection === 'pending' ? 'default' : 'ghost'}
 size="sm"
 onClick={() => setActiveSection('pending')}
 className={cn(
 'rounded-md px-6 font-bold transition-all w-full sm:w-auto',
 activeSection === 'pending' && 'shadow-md'
 )}
 >
 <Clock className="h-4 w-4 mr-2" />
 Pending Payments ({pendingIndents.length})
 </Button>
 <Button
 variant={activeSection === 'history' ? 'default' : 'ghost'}
 size="sm"
 onClick={() => setActiveSection('history')}
 className={cn(
 'rounded-md px-6 font-bold transition-all w-full sm:w-auto',
 activeSection === 'history' && 'shadow-md'
 )}
 >
 <History className="h-4 w-4 mr-2" />
 Payment History ({historyIndents.length})
 </Button>
 </div>

 {/* Content */}
 <div className="flex-1 min-h-0 bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
 <div className="flex-1 overflow-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
 <div className="hidden lg:block">
 <Table>
 <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b border-border">
 <TableRow>
 {hasTenantColumn && (
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Company
 </TableHead>
 )}
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Indent & Machine
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Vendor Details
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Bill Reference
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 Store-In Status
 </TableHead>
 <TableHead className="font-bold text-[11px] uppercase tracking-wider py-4">
 {activeSection === 'pending' ? 'Due Amount' : 'Paid Amount'}
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
 <DollarSign className="h-10 w-10 text-muted-foreground" />
 <p className="font-medium">No results found in {activeSection} payments</p>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 (activeSection === 'pending' ? filteredPending : filteredHistory).map(
 (item: any) => {
 const {
 indent,
 approvedOffer,
 vendorName,
 vendorType,
 billNo,
 typeOfBill,
 inspectedBy,
 amount,
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
 <TableCell className="py-4">
 <div className="flex flex-col">
 <span className="font-bold text-primary">
 {indent?.indentNumber || '—'}
 </span>
 <span className="text-[10px] text-muted-foreground font-medium uppercase">
 {indent?.machineName || '—'}
 </span>
 </div>
 </TableCell>
 <TableCell className="min-w-0">
 <div className="flex flex-col min-w-0">
 <span className="font-bold text-slate-800 text-xs truncate">
 {vendorName}
 </span>
 <span className="text-[10px] text-muted-foreground">
 Type: {vendorType}
 </span>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex flex-col">
 <span className="font-mono text-[11px] font-bold text-slate-700">
 {billNo}
 </span>
 <span className="text-[10px] text-muted-foreground">
 {typeOfBill}
 </span>
 </div>
 </TableCell>
 <TableCell className="min-w-0">
 <div className="flex items-center gap-2 min-w-0">
 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
 <span className="text-[11px] font-bold text-emerald-700 truncate">
 Received By {inspectedBy}
 </span>
 </div>
 </TableCell>
 <TableCell className="font-medium text-xs tabular-nums text-slate-900">
 ₹{Number(amount || 0).toLocaleString()}
 </TableCell>
 <TableCell>
 <Badge
 variant={activeSection === 'pending' ? 'outline' : 'default'}
 className={cn(
 'font-bold uppercase text-[9px]',
 activeSection === 'pending'
 ? 'bg-amber-50 text-amber-700 border-amber-200'
 : 'bg-emerald-600 text-white'
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
 className="h-8 px-4 font-bold rounded-lg transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 <CreditCard className="h-3.5 w-3.5 mr-1.5" />
 Pay Now
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
 Array.from({ length: 3 }).map((_, idx) => (
 <div key={idx} className="rounded-xl border border-border p-4 space-y-3">
 <Skeleton className="h-4 w-1/2" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-2/3" />
 </div>
 ))
 ) : (activeSection === 'pending' ? filteredPending : filteredHistory).length === 0 ? (
 <div className="flex flex-col items-center justify-center space-y-2 opacity-50 py-16">
 <DollarSign className="h-10 w-10 text-muted-foreground" />
 <p className="font-medium text-sm text-center">
 No results found in {activeSection} payments
 </p>
 </div>
 ) : (
 (activeSection === 'pending' ? filteredPending : filteredHistory).map((item: any) => {
 const {
 indent,
 vendorName,
 vendorType,
 billNo,
 typeOfBill,
 inspectedBy,
 amount,
 } = getRowData(item);

 return (
 <div
 key={item.id}
 role="button"
 tabIndex={0}
 className="rounded-xl border border-border p-4 space-y-3 cursor-pointer active:bg-muted/30 transition-colors"
 onClick={() => handleRowClick(item)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 handleRowClick(item);
 }
 }}
 >
 <div className="flex items-start justify-between gap-3">
 <div className="flex flex-col min-w-0">
 <span className="font-bold text-primary truncate">
 {indent?.indentNumber || '—'}
 </span>
 <span className="text-[10px] text-muted-foreground font-medium uppercase truncate">
 {indent?.machineName || '—'}
 </span>
 </div>
 <Badge
 variant={activeSection === 'pending' ? 'outline' : 'default'}
 className={cn(
 'font-bold uppercase text-[9px] shrink-0',
 activeSection === 'pending'
 ? 'bg-amber-50 text-amber-700 border-amber-200'
 : 'bg-emerald-600 text-white'
 )}
 >
 {indent?.taskStatus || 'UNKNOWN'}
 </Badge>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="flex flex-col min-w-0">
 <span className="text-[10px] text-muted-foreground font-medium uppercase">
 Vendor
 </span>
 <span className="font-bold text-slate-800 text-xs truncate">
 {vendorName}
 </span>
 <span className="text-[10px] text-muted-foreground truncate">
 Type: {vendorType}
 </span>
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-[10px] text-muted-foreground font-medium uppercase">
 Bill Reference
 </span>
 <span className="font-mono text-[11px] font-bold text-slate-700 truncate">
 {billNo}
 </span>
 <span className="text-[10px] text-muted-foreground truncate">
 {typeOfBill}
 </span>
 </div>
 </div>

 <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
 <div className="flex items-center gap-2 min-w-0">
 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
 <span className="text-[11px] font-bold text-emerald-700 truncate">
 Received By {inspectedBy}
 </span>
 </div>
 <span className="font-medium text-xs tabular-nums text-slate-900 shrink-0">
 ₹{Number(amount || 0).toLocaleString()}
 </span>
 </div>

 {activeSection === 'pending' && (
 <Button
 size="sm"
 onClick={(e) => handleActionClick(item, e)}
 className="w-full h-9 px-4 font-bold rounded-lg transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 <CreditCard className="h-3.5 w-3.5 mr-1.5" />
 Pay Now
 </Button>
 )}
 </div>
 );
 })
 )}
 </div>
 </div>
 </div>

 {/* Payment Modal */}
 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
 <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
 <DialogHeader className="p-6 border-b border-border text-left">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
 <ShieldCheck size={20} />
 </div>
 <div className="space-y-0.5">
 <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
 Confirm Settlement
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Validate invoice and release payment for{' '}
 <span className="text-foreground font-medium">{selectedIndent?.indentNumber}</span>
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 <div className="p-6 space-y-6">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
 <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
 <h4 className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground leading-none">
 Invoice Summary
 </h4>
 <div className="space-y-2">
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground font-medium">Bill Number:</span>
 <span className="font-bold tabular-nums">
 {selectedIndent?.outhouseRepair?.billNo || 'N/A'}
 </span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground font-medium">Gross Amount:</span>
 <span className="font-bold tabular-nums">
 ₹{selectedIndent?.outhouseRepair?.totalBillAmount?.toLocaleString() || '0'}
 </span>
 </div>
 <div className="flex justify-between text-xs border-t border-border pt-2 mt-2">
 <span className="text-muted-foreground font-semibold">Net Due:</span>
 <span className="font-semibold text-emerald-700 tabular-nums">
 ₹{selectedIndent?.outhouseRepair?.toBePaidAmount?.toLocaleString() || '0'}
 </span>
 </div>
 </div>
 </div>

 <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
 <h4 className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground leading-none">
 Vendor Identity
 </h4>
 <div className="flex flex-col gap-1">
 <span className="text-sm font-bold text-slate-900">
 {selectedIndent?.outhouseRepair?.offers?.[0]?.vendor?.name || 'N/A'}
 </span>
 <Badge variant="outline" className="w-fit text-[9px] bg-sky-50 text-sky-700">
 {selectedIndent?.outhouseRepair?.vendorType || 'General Vendor'}
 </Badge>
 </div>
 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase pt-2">
 <span>
 Approved Rate: ₹
 {selectedIndent?.outhouseRepair?.offers?.[0]?.rate?.toLocaleString() || 'N/A'}
 </span>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-sm font-bold flex items-center gap-2">
 <Scale className="h-4 w-4 text-slate-500" /> Bill Matching *
 </Label>
 <Select
 value={paymentData.billMatch}
 onValueChange={(v) =>
 setPaymentData((prev: any) => ({ ...prev, billMatch: v }))
 }
 >
 <SelectTrigger className="h-11 border-2 focus:ring-emerald-500">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Yes" className="font-bold">
 Yes - Exactly Matches
 </SelectItem>
 <SelectItem value="No" className="font-bold">
 No - Manual Overwrite
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-sm font-bold flex items-center gap-2">
 <ShieldCheck className="h-4 w-4 text-slate-500" /> Final Status *
 </Label>
 <Select
 value={paymentData.billStatus}
 onValueChange={(v: any) =>
 setPaymentData((prev: any) => ({ ...prev, billStatus: v }))
 }
 >
 <SelectTrigger className="h-11 border-2 focus:ring-emerald-500">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Cleared" className="font-bold text-emerald-600">
 Cleared (Full Pay)
 </SelectItem>
 <SelectItem value="Disputed" className="font-bold text-red-600">
 Disputed / Partial
 </SelectItem>
 <SelectItem value="Pending" className="font-bold text-amber-600">
 Pending Authorization
 </SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-sm font-bold flex items-center gap-2 text-indigo-950">
 <IndianRupee className="h-4 w-4" /> Final Payment Release Amount (₹) *
 </Label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
 ₹
 </span>
 <Input
 type="number"
 placeholder="0.00"
 value={paymentData.finalPaymentAmount}
 onChange={(e) =>
 setPaymentData((prev: any) => ({
 ...prev,
 finalPaymentAmount: e.target.value,
 }))
 }
 className="h-14 pl-10 border-2 border-emerald-100 focus-visible:ring-emerald-500 text-xl font-bold text-emerald-700 tabular-nums"
 />
 </div>
 <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
 <AlertCircle className="h-3 w-3" /> Note: This will mark the repair cycle as
 COMPLETE.
 </p>
 </div>
 </div>

              <div className="p-4 bg-muted/40 rounded-xl border border-border flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Settlement Account
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    Standard Operations Ledger - FY 25-26
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/20 border-t border-border gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="font-medium px-6"
              >
                Review Later
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={completeOuthousePaymentMutation.isPending}
                className="px-6 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {completeOuthousePaymentMutation.isPending
                  ? 'Settling...'
                  : 'Confirm & Complete Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail View Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            {(() => {
              const {
                indent,
                outhouse,
                approvedOffer,
                vendorName,
                vendorType,
                billNo,
                typeOfBill,
                inspectedBy,
              } = getRowData(selectedDetailIndent);

              return (
                <>
                  <DialogHeader className="p-6 border-b border-border text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <ShieldCheck size={20} />
                      </div>
                      <div className="space-y-0.5 min-w-0 pr-8">
                        <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
                          Settlement Details
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground truncate">
                          {indent?.indentNumber} • {indent?.machineName}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="p-6 space-y-6">
                    {/* Row 1: Asset + Vendor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                            Asset Identity
                          </h4>
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-foreground">{indent?.machineName}</p>
                            <p className="text-xs font-mono font-bold text-muted-foreground">
                              {indent?.machineSerialNo}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-muted/50 uppercase"
                            >
                              {indent?.machinePartName}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                            Vendor Detail
                          </h4>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-foreground">
                              {approvedOffer?.vendor?.name || vendorName}
                            </p>
                            <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 hover:bg-emerald-100 font-bold uppercase text-[9px]">
                              {outhouse?.vendorType || vendorType}
                            </Badge>
                          </div>
                          <div className="text-[10px] font-bold text-muted-foreground">
                            Approved Rate: ₹{approvedOffer?.rate ? approvedOffer.rate.toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                            Billing Summary
                          </h4>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-muted-foreground">Invoice No:</span>
                              <span className="font-bold font-mono uppercase tracking-tight">
                                {outhouse?.billNo || billNo}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-muted-foreground">Billing Type:</span>
                              <span className="font-bold text-indigo-600">
                                {outhouse?.typeOfBill || typeOfBill}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-muted-foreground">Gross Bill:</span>
                              <span className="font-bold tabular-nums">
                                ₹{(outhouse?.totalBillAmount ?? 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-muted-foreground">To Be Paid:</span>
                              <span className="font-bold tabular-nums">
                                ₹{(outhouse?.toBePaidAmount ?? 0).toLocaleString()}
                              </span>
                            </div>
                            {outhouse?.finalPaymentAmount && (
                              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                  Final Paid:
                                </span>
                                <span className="text-lg font-semibold text-emerald-700">
                                  ₹{Number(outhouse.finalPaymentAmount).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                            Store-In & Inspection
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <p className="text-xs font-bold">
                                Inspected By: {inspectedBy}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              <p className="text-xs font-bold text-muted-foreground">
                                Received:{' '}
                                {formatDate(outhouse?.receivedAt)}
                              </p>
                            </div>
                            {outhouse?.returnTransporterName && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                <p className="text-xs font-bold text-muted-foreground">
                                  Return Transporter: {outhouse.returnTransporterName}
                                </p>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-slate-400" />
                              <p className="text-xs font-bold text-muted-foreground">
                                Status: {indent?.taskStatus}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

 {/* Dispatch Info */}
 {outhouse?.sentAt && (
 <div className="space-y-3">
 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
 Dispatch Details
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <p className="text-[10px] text-muted-foreground font-bold uppercase">
 Sent Date
 </p>
 <p className="text-xs font-bold">
 {new Date(outhouse.sentAt).toLocaleDateString('en-IN')}
 </p>
 </div>
 {outhouse?.transporterName && (
 <div>
 <p className="text-[10px] text-muted-foreground font-bold uppercase">
 Outgoing Transporter
 </p>
 <p className="text-xs font-bold">{outhouse.transporterName}</p>
 </div>
 )}
 {outhouse?.transportationCharges && (
 <div>
 <p className="text-[10px] text-muted-foreground font-bold uppercase">
 Transport Cost
 </p>
 <p className="text-xs font-bold">
 ₹{outhouse.transportationCharges.toLocaleString()}
 </p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Problem */}
 {indent?.problem && (
 <div className="space-y-2">
 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
 Original Issue
 </h4>
 <p className="text-sm font-medium italic text-slate-600 bg-muted/30 p-4 rounded-xl border border-border">
 "{indent.problem}"
 </p>
 </div>
 )}
 </div>

                <DialogFooter className="p-4 sm:p-6 bg-muted/20 border-t border-border mt-0">
                  <Button
                    variant="default"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
                  >
                    Done Auditing
                  </Button>
                </DialogFooter>
 </>
 );
 })()}
 </DialogContent>
 </Dialog>
 </div>
 );
};

export default PaymentPage;
