'use client';

import {
 AlertTriangle,
 Calendar,
 History as HistoryIcon,
 Info,
 Package,
 User,
 Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { useMachinePartDetails } from '../server/tanstackQuery/useMachinePartQueries';

interface MachinePartDetailsModalProps {
 partId: string | null;
 isOpen: boolean;
 onClose: () => void;
}

const formatDate = (dateString: string | null | undefined) => {
 if (!dateString) return '—';
 return new Date(dateString).toLocaleString('en-IN', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 hour12: true,
 });
};

export function MachinePartDetailsModal({ partId, isOpen, onClose }: MachinePartDetailsModalProps) {
 const { data: part, isLoading } = useMachinePartDetails(partId || '');

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border-border shadow-2xl">
 <DialogHeader className="pb-4 border-b">
 <div className="flex items-center gap-4">
 <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
 <Package size={24} />
 </div>
 <div className="min-w-0 flex-1">
 <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
 <span className="truncate">
 {isLoading ? 'Component Details' : part?.name || 'Part Details'}
 </span>
 {!isLoading && part && (
 <Badge
 variant={part.isActive ? 'default' : 'secondary'}
 className="text-[10px] uppercase font-semibold px-2 py-0 shrink-0"
 >
 {part.isActive ? 'Active' : 'Inactive'}
 </Badge>
 )}
 </DialogTitle>
 <DialogDescription asChild>
 <div className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 mt-0.5 min-w-0">
 {isLoading ? (
 <Skeleton className="h-4 w-32" />
 ) : (
 <>
 <span className="font-mono text-primary shrink-0">
 {part?.partNumber || 'NO-PN'}
 </span>
 <span className="shrink-0">•</span>
 <span className="truncate">{part?.machine?.name}</span>
 </>
 )}
 </div>
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 {isLoading ? (
 <div className="py-8 space-y-6">
 <Skeleton className="h-20 w-full" />
 <Skeleton className="h-40 w-full" />
 </div>
 ) : part ? (
 <div className="py-6 space-y-8">
 {/* Description & Metadata */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
 <Info className="h-3.5 w-3.5" /> Component Details
 </h4>
 <div className="rounded-xl border bg-muted/20 p-4">
 <p className="text-sm text-foreground/80 leading-relaxed font-medium italic">
 {part.description ||
 'No specific technical description provided for this component.'}
 </p>
 </div>
 </div>
 <div className="space-y-4">
 <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
 <Calendar className="h-3.5 w-3.5" /> Registration Info
 </h4>
 <div className="space-y-3 rounded-xl border p-4 bg-muted/5">
 <div className="flex justify-between text-xs">
 <span className="font-bold text-muted-foreground uppercase tracking-tighter">
 Registered On
 </span>
 <span className="font-medium tabular-nums">{formatDate(part.createdAt)}</span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="font-bold text-muted-foreground uppercase tracking-tighter">
 Last Updated
 </span>
 <span className="font-medium tabular-nums">{formatDate(part.updatedAt)}</span>
 </div>
 </div>
 </div>
 </div>

 <Separator />

 {/* Maintenance History */}
 <div className="space-y-4">
 <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
 <HistoryIcon className="h-4 w-4 text-indigo-500" /> Maintenance & Service History
 </h4>

 <div className="rounded-xl border overflow-hidden shadow-sm">
 {part.workOrders && (part.workOrders as any[]).length > 0 ? (
 <>
 {/* Desktop Table */}
 <div className="hidden sm:block overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/50">
 <TableRow>
 <TableHead className="text-[10px] font-semibold uppercase">Date</TableHead>
 <TableHead className="text-[10px] font-semibold uppercase">Type</TableHead>
 <TableHead className="text-[10px] font-semibold uppercase">
 Technician
 </TableHead>
 <TableHead className="text-[10px] font-semibold uppercase text-right">
 Notes
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {(part.workOrders as any[]).map((wo) => (
 <TableRow key={wo.id} className="hover:bg-muted/30">
 <TableCell className="font-mono text-[11px] font-bold text-muted-foreground">
 {formatDate(wo.completedAt || wo.scheduledDate || wo.createdAt)}
 </TableCell>
 <TableCell>
 <Badge
 variant="outline"
 className="text-[11px] font-semibold uppercase py-0 border-indigo-100 text-indigo-600 bg-indigo-50"
 >
 {wo.type}
 </Badge>
 </TableCell>
 <TableCell className="text-xs font-bold">
 <span className="flex items-center gap-1.5">
 <User className="h-3 w-3 shrink-0" />{' '}
 <span className="truncate">
 {wo.completedBy?.name || wo.currentAssignee?.name || wo.responsible?.name || 'System'}
 </span>
 </span>
 </TableCell>
 <TableCell className="text-right text-[11px] text-muted-foreground italic max-w-[200px] truncate">
 "{wo.completionNote || wo.description || 'Component serviced'}"
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>

 {/* Mobile Cards */}
 <div className="sm:hidden divide-y">
 {(part.workOrders as any[]).map((wo) => (
 <div key={wo.id} className="p-3 space-y-2">
 <div className="flex items-center justify-between gap-2">
 <span className="font-mono text-[11px] font-bold text-muted-foreground truncate">
 {formatDate(wo.completedAt || wo.scheduledDate || wo.createdAt)}
 </span>
 <Badge
 variant="outline"
 className="text-[11px] font-semibold uppercase py-0 border-indigo-100 text-indigo-600 bg-indigo-50 shrink-0"
 >
 {wo.type}
 </Badge>
 </div>
 <div className="flex items-center gap-1.5 text-xs font-bold min-w-0">
 <User className="h-3 w-3 shrink-0" />
 <span className="truncate">{wo.completedBy?.name || wo.currentAssignee?.name || wo.responsible?.name || 'System'}</span>
 </div>
 <p className="text-[11px] text-muted-foreground italic break-words">
 "{wo.completionNote || wo.description || 'Component serviced'}"
 </p>
 </div>
 ))}
 </div>
 </>
 ) : (
 <div className="py-12 flex flex-col items-center justify-center opacity-40 space-y-2">
 <Wrench className="h-8 w-8" />
 <p className="text-xs font-bold uppercase">
 No specific service records for this part
 </p>
 </div>
 )}
 </div>
 </div>

 {/* Breakdown Incidents */}
 <div className="space-y-4">
 <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 text-rose-500" /> Incident Log
 </h4>
 <div className="rounded-xl border overflow-hidden shadow-sm">
 {part.breakdowns && (part.breakdowns as any[]).length > 0 ? (
 <>
 {/* Desktop Table */}
 <div className="hidden sm:block overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/50">
 <TableRow>
 <TableHead className="text-[10px] font-semibold uppercase">Date</TableHead>
 <TableHead className="text-[10px] font-semibold uppercase">
 Title
 </TableHead>
 <TableHead className="text-[10px] font-semibold uppercase">
 Severity
 </TableHead>
 <TableHead className="text-[10px] font-semibold uppercase text-right">
 Status
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {(part.breakdowns as any[]).map((br) => (
 <TableRow key={br.id} className="hover:bg-muted/30">
 <TableCell className="font-mono text-[11px] font-bold text-muted-foreground">
 {formatDate(br.reportedAt || br.createdAt)}
 </TableCell>
 <TableCell className="text-xs font-bold max-w-[200px] truncate">
 {br.title || br.description || br.breakdownNumber || 'Breakdown Incident'}
 </TableCell>
 <TableCell>
 <Badge
 variant="outline"
 className="text-[11px] font-semibold uppercase py-0 border-rose-100 text-rose-600 bg-rose-50"
 >
 {br.severity || 'Normal'}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 <span
 className={
 br.isResolved
 ? 'text-emerald-600 text-[10px] font-semibold uppercase'
 : 'text-rose-600 text-[10px] font-semibold uppercase'
 }
 >
 {br.isResolved ? 'Resolved' : 'Active'}
 </span>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>

 {/* Mobile Cards */}
 <div className="sm:hidden divide-y">
 {(part.breakdowns as any[]).map((br) => (
 <div key={br.id} className="p-3 space-y-2">
 <div className="flex items-start justify-between gap-2">
 <p className="text-xs font-bold min-w-0 truncate">
 {br.title || br.description || br.breakdownNumber || 'Breakdown Incident'}
 </p>
 <span
 className={`shrink-0 text-[10px] font-semibold uppercase ${
 br.isResolved ? 'text-emerald-600' : 'text-rose-600'
 }`}
 >
 {br.isResolved ? 'Resolved' : 'Active'}
 </span>
 </div>
 <div className="flex items-center justify-between gap-2">
 <span className="font-mono text-[11px] font-bold text-muted-foreground truncate">
 {formatDate(br.reportedAt || br.createdAt)}
 </span>
 <Badge
 variant="outline"
 className="text-[11px] font-semibold uppercase py-0 border-rose-100 text-rose-600 bg-rose-50 shrink-0"
 >
 {br.severity || 'Normal'}
 </Badge>
 </div>
 </div>
 ))}
 </div>
 </>
 ) : (
 <div className="py-12 flex flex-col items-center justify-center opacity-40 space-y-2">
 <AlertTriangle className="h-8 w-8" />
 <p className="text-xs font-bold uppercase">
 No recorded failures for this component
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 ) : (
 <div className="py-12 text-center text-muted-foreground">Part not found.</div>
 )}
 </DialogContent>
 </Dialog>
 );
}
