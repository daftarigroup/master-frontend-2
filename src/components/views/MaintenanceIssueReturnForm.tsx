import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { fetchWorkOrderList, type WorkOrderRow } from '@/features/maintenancepro/work_orders/server/api/workOrdersApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ClipLoader as Loader } from 'react-spinners';
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select';
import { updateIssueRecordById } from '@/services/issueService';
import { isAllowedFirm } from '@/lib/firmAccess';
import type { IssueSheet } from '@/types';
import { toast } from 'sonner';

interface Props {
    sheetIssues: IssueSheet[];
    user: any;
    initialWorkOrderId?: string;
    initialIssueId?: string;
    onSuccess: () => void;
}

export function MaintenanceIssueReturnForm({
    sheetIssues,
    user,
    initialWorkOrderId,
    initialIssueId,
    onSuccess,
}: Props) {
    const [selectedIssueId, setSelectedIssueId] = useState<string>(initialIssueId ?? '');
    const [returnerName, setReturnerName] = useState<string>(user?.name ?? '');
    const [damageRemarks, setDamageRemarks] = useState<string>('');
    const [goodQty, setGoodQty] = useState<string>('');
    const [damageQty, setDamageQty] = useState<string>('0');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Query work orders to know live status and details of work orders
    const workOrdersQ = useQuery({
        queryKey: ['maintenance', 'work-orders', 'status-lookup'],
        queryFn: async () => (await fetchWorkOrderList({ limit: 500 })).data,
        staleTime: 30_000,
    });

    const workOrderMap = useMemo(() => {
        const map = new Map<string, WorkOrderRow>();
        for (const wo of workOrdersQ.data ?? []) {
            map.set(wo.id, wo);
        }
        return map;
    }, [workOrdersQ.data]);

    // Helper to compute returnable metrics for a maintenance issue
    const getIssueReturnableMetrics = (issue: IssueSheet) => {
        const totalIssued = Number(issue.givenQty ?? issue.quantity ?? 0);
        const previouslyReturned = Number(issue.rejected_damage_qty || 0);

        const woFromMap = issue.workOrderId ? workOrderMap.get(issue.workOrderId) : undefined;
        const rawStatus = String(
            woFromMap?.status ||
            issue.workOrderStatus ||
            (selectedIssueId === String(issue.id) ? woQ?.data?.status : '') ||
            ''
        ).toUpperCase();
        const isCompleted = rawStatus === 'COMPLETED' || rawStatus === 'COMPLETED_LATE';

        // Check quantity used in repair if completed
        let usedInRepair = 0;
        if (isCompleted) {
            const repairParts =
                woFromMap?.repairParts ||
                (selectedIssueId === String(issue.id) ? woQ?.data?.repairParts : undefined) ||
                issue.workOrderRepairParts ||
                [];
            const cleanProd = (issue.productName || '').trim().toLowerCase();
            const match = repairParts.find(
                (rp: any) => rp.partName && cleanProd && rp.partName.trim().toLowerCase() === cleanProd
            );
            usedInRepair = match ? Number(match.quantity || 0) : 0;
        }

        // If completed: unused parts = totalIssued - usedInRepair.
        // If not completed yet: all issued parts are still returnable.
        const unusedQty = isCompleted
            ? Math.max(0, Math.round((totalIssued - usedInRepair) * 1000) / 1000)
            : totalIssued;

        // Returnable to Store: unusedQty - previouslyReturned
        const maxReturnable = Math.max(0, Math.round((unusedQty - previouslyReturned) * 1000) / 1000);

        return {
            totalIssued,
            usedInRepair,
            previouslyReturned,
            unusedQty,
            maxReturnable,
            isCompleted,
        };
    };

    // If the issue row only has workOrderId (cuid) and not workOrderCode, fetch the work order details to display the proper code
    const woQ = useQuery({
        queryKey: ['maintenance', 'work-orders', selectedIssueId],
        enabled: Boolean(selectedIssueId),
        queryFn: async () => {
            const iss = (sheetIssues || []).find((i) => String(i.id) === String(selectedIssueId));
            if (!iss?.workOrderId) return null;
            return (await api.get(`/maintenance/work-orders/${iss.workOrderId}`)).data.data as WorkOrderRow;
        },
    });

    // Filter available maintenance issues:
    // Only show issues that:
    // 1. Have been issued (actual1 is set and givenQty > 0)
    // 2. Still have parts remaining to return (maxReturnable > 0)
    //    - If work order is completed, only the unused leftover parts (issued - usedInRepair - returned) can be returned!
    //    - If all parts were consumed in repair, maxReturnable is 0 so it won't appear.
    const maintenanceIssues = useMemo(() => {
        return (sheetIssues || []).filter((i) => {
            const isFirmMatch = isAllowedFirm(
                { id: i.firm_id, name: i.projectName || i.firm_name },
                user?.firm_access || []
            );
            const isIssued = Boolean(i.actual1 && i.actual1 !== '');
            const isMaintenance = i.issueKind === 'MAINTENANCE';
            if (!isFirmMatch || !isIssued || !isMaintenance) return false;

            const { maxReturnable } = getIssueReturnableMetrics(i);
            return maxReturnable > 0;
        });
    }, [sheetIssues, user?.firm_access, workOrderMap, woQ.data]);

    // If an initial work order was passed, pre-select first matching issue if none selected
    useEffect(() => {
        if (!selectedIssueId && initialWorkOrderId && maintenanceIssues.length > 0) {
            const match = maintenanceIssues.find((i) => i.workOrderId === initialWorkOrderId);
            if (match) setSelectedIssueId(String(match.id));
        }
    }, [initialWorkOrderId, maintenanceIssues, selectedIssueId]);

    // Currently selected issue record
    const selectedIssue = useMemo(() => {
        if (!selectedIssueId) return null;
        return (sheetIssues || []).find((i) => String(i.id) === String(selectedIssueId)) || null;
    }, [sheetIssues, selectedIssueId]);

    // Quantity metrics
    const metrics = useMemo(() => {
        if (!selectedIssue) {
            return {
                totalIssued: 0,
                usedInRepair: 0,
                previouslyReturned: 0,
                unusedQty: 0,
                maxReturnable: 0,
                isCompleted: false,
            };
        }
        return getIssueReturnableMetrics(selectedIssue);
    }, [selectedIssue, workOrderMap, woQ.data]);

    const {
        totalIssued,
        usedInRepair,
        previouslyReturned,
        unusedQty,
        maxReturnable,
        isCompleted: isSelectedCompleted,
    } = metrics;

    const workOrderDisplay = useMemo(() => {
        if (!selectedIssue) return '';
        const woFromMap = selectedIssue.workOrderId ? workOrderMap.get(selectedIssue.workOrderId) : undefined;
        const code = selectedIssue.workOrderCode || woFromMap?.workOrderCode || woQ.data?.workOrderCode;
        const title = selectedIssue.workOrderTitle || woFromMap?.title || (woFromMap as any)?.plan?.title || woQ.data?.title || (woQ.data as any)?.plan?.title;
        if (code && title) return `${code} · ${title}`;
        if (code) return code;
        if (woQ.isLoading) return 'Loading work order…';
        if (selectedIssue.workOrderId) {
            return `WO-${selectedIssue.workOrderId.slice(-6).toUpperCase()}`;
        }
        return '—';
    }, [selectedIssue, workOrderMap, woQ.data, woQ.isLoading]);

    // When selecting an issue, initialize goodQty with maxReturnable
    const handleIssueSelect = (id: string) => {
        setSelectedIssueId(id);
        const iss = (sheetIssues || []).find((i) => String(i.id) === String(id));
        if (iss) {
            const m = getIssueReturnableMetrics(iss);
            setGoodQty(String(m.maxReturnable));
            setDamageQty('0');
            toast.info(`Loaded maintenance issue ${iss.issueNo} (${iss.productName})`);
        }
    };

    const goodN = Number(goodQty) || 0;
    const damageN = Number(damageQty) || 0;
    const currentReturnTotal = Math.round((goodN + damageN) * 1000) / 1000;
    const isOverLimit = currentReturnTotal > maxReturnable + 0.0005;

    const searchableOptions: SearchableOption[] = useMemo(() => {
        return maintenanceIssues.map((issue) => {
            const m = getIssueReturnableMetrics(issue);
            const code = issue.issueNo || `ISS-${issue.id}`;
            const label = `${code} - ${issue.productName || 'Part'}`;
            const woFromMap = issue.workOrderId ? workOrderMap.get(issue.workOrderId) : undefined;
            const woCode = issue.workOrderCode || woFromMap?.workOrderCode;
            const woTitle = issue.workOrderTitle || woFromMap?.title || (woFromMap as any)?.plan?.title;
            const woDisplay = woCode
                ? (woTitle ? `${woCode} (${woTitle})` : woCode)
                : issue.workOrderId
                ? `WO-${issue.workOrderId.slice(-6).toUpperCase()}`
                : '';
            const statusTag = m.isCompleted
                ? `Completed repair (${m.usedInRepair} used, ${m.maxReturnable} unused to return)`
                : `Available: ${m.maxReturnable} ${issue.uom || ''}`;
            const subparts = [
                issue.projectName,
                issue.machineName,
                woDisplay ? `WO: ${woDisplay}` : '',
                statusTag,
            ].filter(Boolean);

            return {
                value: String(issue.id),
                label,
                sublabel: subparts.join(' · '),
                keywords: [
                    code,
                    issue.productName || '',
                    issue.machineName || '',
                    woCode || '',
                    issue.workOrderId || '',
                    issue.projectName || '',
                ],
            };
        });
    }, [maintenanceIssues, workOrderMap, woQ.data]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedIssue) {
            toast.error('Please select an issue to return');
            return;
        }
        if (isSelectedCompleted && maxReturnable <= 0) {
            toast.error(`All parts for work order ${workOrderDisplay} were used in the repair. Nothing to return.`);
            return;
        }
        if (!returnerName.trim()) {
            toast.error('Returner Name is required');
            return;
        }
        if (currentReturnTotal <= 0) {
            toast.error('Please enter a quantity to return (Good Qty or Rejected/Damage Qty)');
            return;
        }
        if (isOverLimit) {
            toast.error(`Cannot return more than available quantity (${maxReturnable} ${selectedIssue.uom || ''})`);
            return;
        }

        setIsSubmitting(true);
        try {
            const newReturnedTotal = previouslyReturned + currentReturnTotal;
            let finalRemarks = damageRemarks.trim();
            if (damageN > 0) {
                finalRemarks = finalRemarks
                    ? `${finalRemarks} (Damaged/Rejected: ${damageN})`
                    : `Damaged/Rejected: ${damageN}`;
            }

            await updateIssueRecordById(Number(selectedIssue.id), {
                return_person_name: returnerName.trim(),
                damage_remark: finalRemarks || undefined,
                rejected_damage_qty: String(newReturnedTotal),
            });

            toast.success(
                `Parts return processed successfully. ${currentReturnTotal} ${selectedIssue.uom || ''} returned to Store stock.`
            );

            // Reset form
            setSelectedIssueId('');
            setGoodQty('');
            setDamageQty('0');
            setDamageRemarks('');
            onSuccess();
        } catch (error) {
            console.error('Error processing maintenance parts return:', error);
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(err?.response?.data?.message || err?.message || 'Error processing parts return');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* RETURN CONTEXT */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                        Return Context (Machine & Repair)
                    </CardTitle>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-1">
                        <Wrench className="size-3" /> Machine parts return
                    </span>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1.5 lg:col-span-1">
                            <Label className="text-slate-600 font-semibold text-xs uppercase">
                                Select Issue Number <span className="text-destructive">*</span>
                            </Label>
                            <SearchableSelect
                                options={searchableOptions}
                                value={selectedIssueId}
                                onValueChange={handleIssueSelect}
                                placeholder="Search issue no. or part"
                                searchPlaceholder="Search issue no, part, machine or WO"
                                emptyText={maintenanceIssues.length === 0 ? 'No issued parts waiting for return' : 'No issue found'}
                                className="h-11 w-full bg-white"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold text-xs uppercase">Project Name</Label>
                            <Input
                                value={selectedIssue?.projectName || selectedIssue?.firm_name || ''}
                                disabled
                                placeholder="Auto-filled project"
                                className="h-11 bg-slate-50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold text-xs uppercase">Machine</Label>
                            <Input
                                value={selectedIssue?.machineName || selectedIssue?.machineId || ''}
                                disabled
                                placeholder="Auto-filled machine"
                                className="h-11 bg-slate-50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold text-xs uppercase">Work Order</Label>
                            <Input
                                value={workOrderDisplay}
                                disabled
                                placeholder="Auto-filled work order"
                                className="h-11 bg-slate-50 font-medium text-slate-800"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* RETURN DETAILS */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Return Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">
                                Returner Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                placeholder="Who is returning?"
                                className="h-11 bg-white border-slate-200 focus:ring-primary/20"
                                value={returnerName}
                                onChange={(e) => setReturnerName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Original Issuer</Label>
                            <Input
                                value={selectedIssue?.issuePersonName || ''}
                                disabled
                                placeholder="Issuer name"
                                className="h-11 bg-slate-50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-600 font-semibold">Damage / Return Remarks</Label>
                            <Input
                                placeholder="Condition of returned item"
                                className="h-11 bg-white border-slate-200 focus:ring-primary/20"
                                value={damageRemarks}
                                onChange={(e) => setDamageRemarks(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5 lg:col-span-3">
                            <Label className="text-slate-600 font-semibold">Original Issue Remarks</Label>
                            <Input
                                value={selectedIssue?.issueTo || ''}
                                disabled
                                placeholder="Original remarks"
                                className="h-11 bg-slate-50"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Material / Parts Being Returned */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-6 bg-primary rounded-full" />
                        <h3 className="text-lg font-bold text-slate-700">Parts Being Returned</h3>
                    </div>
                    {selectedIssue && (
                        <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2">
                            <span>Issued: <strong>{totalIssued} {selectedIssue.uom}</strong></span>
                            {isSelectedCompleted && <span>· Used in Repair: <strong className="text-slate-700">{usedInRepair}</strong></span>}
                            {isSelectedCompleted && <span>· Leftover Unused: <strong className="text-blue-700">{unusedQty}</strong></span>}
                            {previouslyReturned > 0 && <span>· Previously Returned: <strong>{previouslyReturned}</strong></span>}
                            <span>· Max Returnable: <strong className="text-primary">{maxReturnable} {selectedIssue.uom}</strong></span>
                        </div>
                    )}
                </div>

                <Card className="border-slate-200 shadow-sm hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                        {selectedIssue && isSelectedCompleted && (
                            <div className="mb-4 rounded-lg bg-blue-50/80 border border-blue-200 p-3 text-xs text-blue-900 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                                    <span>
                                        Work order <strong>{workOrderDisplay}</strong> repair was completed using <strong>{usedInRepair} {selectedIssue.uom}</strong>. Returning remaining <strong>{unusedQty} {selectedIssue.uom}</strong> unused parts back to store inventory.
                                    </span>
                                </div>
                                <span className="font-semibold text-blue-700 uppercase tracking-wider text-[10px] bg-blue-100/70 px-2 py-0.5 rounded">
                                    Leftover Parts Return
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4">
                            <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Returning Part Item
                            </div>
                            {selectedIssue && (
                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="size-3" /> Max Returnable: {maxReturnable} {selectedIssue.uom}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase">Group Head</Label>
                                <Input value={selectedIssue?.groupHead || ''} disabled className="h-11 bg-slate-50" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase">Part (Store Item)</Label>
                                <Input value={selectedIssue?.productName || ''} disabled className="h-11 bg-slate-50" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 uppercase">
                                    Good Qty to Return {selectedIssue ? `(Max: ${maxReturnable})` : ''}
                                </Label>
                                <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={maxReturnable}
                                    placeholder="0"
                                    disabled={!selectedIssue}
                                    className="h-11 bg-white border-primary/20 focus:ring-primary/20 font-bold text-primary"
                                    value={goodQty}
                                    onChange={(e) => setGoodQty(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-red-500 uppercase">
                                    Rejected / Damage Qty
                                </Label>
                                <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={maxReturnable}
                                    placeholder="0"
                                    disabled={!selectedIssue}
                                    className="h-11 bg-white border-red-200 focus:ring-red-100 text-red-600 font-bold"
                                    value={damageQty}
                                    onChange={(e) => setDamageQty(e.target.value)}
                                />
                            </div>
                        </div>

                        {isSelectedCompleted && maxReturnable <= 0 && (
                            <div className="mt-3 text-xs font-semibold text-destructive bg-destructive/10 p-2.5 rounded-lg flex items-center gap-1.5">
                                <AlertTriangle className="size-4 shrink-0" /> Work order {workOrderDisplay} is already completed. All parts were used in the repair, so no parts can be returned.
                            </div>
                        )}

                        {isOverLimit && (
                            <div className="mt-3 text-xs font-semibold text-destructive flex items-center gap-1.5">
                                <AlertTriangle className="size-3.5" /> Total return ({currentReturnTotal}) exceeds available returnable quantity ({maxReturnable})
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="pt-4 pb-10">
                <Button
                    className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200/50 transition-all active:scale-[0.98]"
                    type="submit"
                    disabled={isSubmitting || !selectedIssue || isOverLimit || currentReturnTotal <= 0 || (isSelectedCompleted && maxReturnable <= 0)}
                >
                    {isSubmitting ? (
                        <Loader size={20} color="white" />
                    ) : (
                        <span className="flex items-center gap-2">
                            <RotateCcw size={20} />
                            Process Parts Return ({currentReturnTotal} {selectedIssue?.uom || 'units'})
                        </span>
                    )}
                </Button>
            </div>
        </form>
    );
}

export default MaintenanceIssueReturnForm;
