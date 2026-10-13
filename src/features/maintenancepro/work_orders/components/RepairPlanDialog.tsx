import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardList, Hammer, PackageCheck, Plus, RotateCcw, Trash2, Truck, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { hasPageAccess } from '@/lib/permissions';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { PartLine, WorkOrderRow } from '../server/api/workOrdersApi';
import {
  usePartsNeeded,
  useRaisePartsIndent,
  useRemovePartNeeded,
  useSaveRepairPlan,
} from '../server/tanstackQuery/useWorkOrderActions';
import { toastError } from './workOrderUtils';

/**
 * Process repair, step by step (the client's repair flow):
 *   work type -> In-house: "Material required?" -> Yes: list the parts, raise the Store indent in one click, the Store issues them,
 *                                                  the repair can be completed only when every part is issued
 *                                              -> No: direct repair, straight to completion
 *             -> Outsourced: the vendor supplies the material; continue with the vendor details (the existing form)
 * Completion itself is the existing form (`onContinue`), which the server also guards.
 */
interface Props {
  wo: WorkOrderRow | null;
  onClose: () => void;
  /** open the existing repair form (completion, or the vendor details of an outsourced repair) */
  onContinue: (wo: WorkOrderRow, type: 'in_house' | 'out_source') => void;
}

interface ItemRow {
  id: string;
  name: string;
  groupHead: string;
  uom: string | null;
}

const fmtQty = (n: number) => String(Math.round(n * 1000) / 1000);

function lineStatus(l: PartLine): { text: string; tone: string } {
  if (l.complete) return { text: `Issued ${fmtQty(l.issued)} of ${fmtQty(l.quantity)}`, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' };
  if (l.issued > 0) return { text: `Issued ${fmtQty(l.issued)} of ${fmtQty(l.quantity)}`, tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
  if ((l.pending ?? 0) > 0) return { text: `${fmtQty(l.pending ?? 0)} pending approval`, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' };
  if (l.indentNumber) return { text: `Indented ${l.indentNumber}`, tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' };
  return { text: 'Needed', tone: 'bg-muted text-muted-foreground' };
}

export function RepairPlanDialog({ wo, onClose, onContinue }: Props) {
  const { user } = useAuth();
  const canIssue = hasPageAccess(user, 'store_issue_maintenance', 'EDIT', 'storeIssueMaintenance');
  const canReturn = hasPageAccess(user, 'store_issue_return', 'EDIT', 'storeIssueReturn') || canIssue;
  const open = !!wo;
  const firmId = (wo?.machine as { assignment?: { firmId?: string } } | undefined)?.assignment?.firmId ?? wo?.machine?.firmId ?? null;

  const partsQ = usePartsNeeded(wo?.id ?? null, open);
  const save = useSaveRepairPlan();
  const remove = useRemovePartNeeded();
  const raise = useRaisePartsIndent();

  const [workType, setWorkType] = useState<'in_house' | 'outsourced'>('in_house');
  const [material, setMaterial] = useState<boolean | null>(null);
  const [groupHead, setGroupHead] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!wo) return;
    const outsourced = !!wo.outsource || wo.typeOfWork === 'out_source' || wo.typeOfWork === 'outhouse';
    setWorkType(outsourced ? 'outsourced' : 'in_house');
    setMaterial(wo.materialRequired ?? null);
    setGroupHead('');
    setItemName('');
    setQuantity('1');
    setNote('');
  }, [wo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const parts = partsQ.data?.parts ?? wo?.parts ?? { lines: [], total: 0, complete: 0, waiting: true };
  const decided = partsQ.data?.materialRequired ?? wo?.materialRequired ?? null;

  // the project's Store items (the same item can be entered more than once in the master: one entry per group head + name is enough)
  const itemsQ = useQuery({
    queryKey: ['store-items-of-project', firmId],
    enabled: open && workType === 'in_house' && material === true && !!firmId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res: any = await apiClient.get('/store/entity/item', { params: { firm_id: firmId, order: 'item_name.asc', limit: 'all' } });
      const seen = new Set<string>();
      const rows: ItemRow[] = [];
      for (const r of (res.data ?? []) as any[]) {
        const gh = String(r.group_head?.name ?? '').trim();
        const name = String(r.item_name ?? '').trim();
        const key = `${gh.toLowerCase()}|${name.toLowerCase()}`;
        if (!gh || !name || seen.has(key)) continue;
        seen.add(key);
        rows.push({ id: String(r.id), name, groupHead: gh, uom: r.uom?.name ?? null });
      }
      return rows;
    },
  });
  const items = itemsQ.data ?? [];
  const groupHeads = useMemo(() => Array.from(new Set(items.map((i) => i.groupHead))).sort((a, b) => a.localeCompare(b)), [items]);
  const itemsOfGroup = useMemo(() => items.filter((i) => i.groupHead === groupHead), [items, groupHead]);
  const picked = itemsOfGroup.find((i) => i.name === itemName);

  const busy = save.isPending || remove.isPending || raise.isPending;
  const qtyN = Number(quantity);
  const addProblem = !groupHead ? 'Choose the group head' : !itemName ? 'Choose the part' : !(qtyN > 0) ? 'Enter the quantity' : null;
  const toIndent = parts.lines.filter((l) => !l.complete && !l.indentNumber);
  const indentedNotIssued = parts.lines.filter((l) => !l.complete && l.indentNumber);
  const hasAnyIssued = parts.lines.some((l) => l.issued > 0);
  const isFullyIssued = parts.total > 0 && parts.lines.every((l) => l.complete);
  const completeBlock = parts.total === 0 ? 'List at least one part first' : !hasAnyIssued ? 'No parts have been issued by the Store yet' : null;
  const hasCommittedParts = parts.lines.some((l) => l.issued > 0 || (l.pending ?? 0) > 0 || Boolean(l.indentNumber));

  const saveDecision = async (required: boolean) => {
    if (!wo) return;
    try {
      await save.mutateAsync({ id: wo.id, materialRequired: required });
      setMaterial(required);
      toast.success(required ? 'Material required: now list the parts' : 'Direct repair: no Store parts needed');
    } catch (e) {
      toastError(e, 'Could not save');
    }
  };

  const addPart = async () => {
    if (!wo || addProblem) return;
    try {
      await save.mutateAsync({ id: wo.id, materialRequired: true, partsNeeded: [{ itemName, groupHead, quantity: qtyN, note: note.trim() || undefined }] });
      setMaterial(true);
      setItemName('');
      setQuantity('1');
      setNote('');
    } catch (e) {
      toastError(e, 'Could not add the part');
    }
  };

  const removeLine = async (l: PartLine) => {
    if (!wo) return;
    try {
      await remove.mutateAsync({ id: wo.id, partId: l.id });
    } catch (e) {
      toastError(e, 'Could not remove the part');
    }
  };

  const createIndent = async (again = false) => {
    if (!wo) return;
    try {
      const r = await raise.mutateAsync({ id: wo.id, again });
      toast.success(`Indent ${r.indentNumber} created for ${r.count} part${r.count > 1 ? 's' : ''}. The Store will process it.`);
    } catch (e) {
      toastError(e, 'Could not create the indent');
    }
  };

  if (!wo) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5" /> Process repair
          </DialogTitle>
          <DialogDescription>
            {wo.workOrderCode ?? ''} {wo.title ?? wo.plan?.title ?? ''} · {wo.machine?.name ?? ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1. Who does the repair?</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'in_house' as const, label: 'In-house', hint: 'Our own team', Icon: Hammer },
                {
                  key: 'outsourced' as const,
                  label: 'Outsourced',
                  hint: hasCommittedParts ? 'Cannot outsource while Store parts are active' : 'A vendor repairs it and supplies the material',
                  Icon: Truck,
                },
              ].map(({ key, label, hint, Icon }) => {
                const isOutsourceDisabled = key === 'outsourced' && hasCommittedParts;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={busy || isOutsourceDisabled}
                    onClick={() => setWorkType(key)}
                    aria-pressed={workType === key}
                    title={isOutsourceDisabled ? 'Store parts are already indented or issued for this repair' : undefined}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      workType === key ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:border-primary/40'
                    )}
                  >
                    <Icon className={cn('mt-0.5 size-5 shrink-0', workType === key ? 'text-primary' : 'text-muted-foreground')} />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {workType === 'outsourced' && (
            <section className="rounded-lg border bg-muted/30 p-3 text-sm">
              The vendor handles the parts and material for an outsourced repair, so there is nothing to list or indent. Continue with the vendor details,
              then the repair work and completion follow the usual vendor steps.
            </section>
          )}

          {workType === 'in_house' && (
            <section className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Is material (a spare part) required?</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: true, label: 'Yes, parts are needed', hint: 'Listed here, indented and issued by the Store' },
                  {
                    v: false,
                    label: 'No, direct repair',
                    hint: hasCommittedParts ? 'Cannot switch: parts already indented or issued' : 'No Store parts needed',
                  },
                ].map(({ v, label, hint }) => {
                  const isDirectDisabled = v === false && hasCommittedParts;
                  return (
                    <button
                      key={String(v)}
                      type="button"
                      disabled={busy || isDirectDisabled}
                      onClick={() => (v ? setMaterial(true) : void saveDecision(false))}
                      aria-pressed={material === v}
                      title={isDirectDisabled ? 'Parts have already been indented or issued from the Store for this repair' : undefined}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                        material === v ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:border-primary/40'
                      )}
                    >
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {workType === 'in_house' && material === false && (
            <section className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> Direct repair saved. When the work is done, complete the repair.
            </section>
          )}

          {workType === 'in_house' && material === true && (
            <section className="space-y-4">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3. Parts to replace</Label>

              {parts.lines.length > 0 && (
                <div className="divide-y rounded-lg border">
                  {parts.lines.map((l) => {
                    const s = lineStatus(l);
                    return (
                      <div key={l.id} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{l.itemName}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.groupHead} · {fmtQty(l.quantity)} {l.uom ?? ''}
                            {l.note ? ` · ${l.note}` : ''}
                          </div>
                        </div>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', s.tone)}>{s.text}</span>
                        {(() => {
                          const isLineLocked = l.issued > 0 || (l.pending ?? 0) > 0 || Boolean(l.indentNumber);
                          const lockReason = l.issued > 0
                            ? 'Already issued from the Store'
                            : (l.pending ?? 0) > 0
                            ? 'Pending Store approval'
                            : l.indentNumber
                            ? `Indented (${l.indentNumber})`
                            : 'Remove';
                          return (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              disabled={busy || isLineLocked}
                              title={lockReason}
                              aria-label={`Remove ${l.itemName}`}
                              onClick={() => void removeLine(l)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-3 rounded-lg border border-dashed p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Group head</Label>
                    <SearchableSelect
                      options={groupHeads.map((g) => ({ value: g, label: g }))}
                      value={groupHead}
                      onValueChange={(v) => {
                        setGroupHead(v);
                        setItemName('');
                      }}
                      placeholder={itemsQ.isLoading ? 'Loading Store items…' : 'Select group head'}
                      searchPlaceholder="Search group head"
                      emptyText={firmId ? 'No Store items in this project' : 'This machine has no project'}
                      modal
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Part (Store item)</Label>
                    <SearchableSelect
                      options={itemsOfGroup.map((i) => ({ value: i.name, label: i.name, sublabel: i.uom ?? undefined }))}
                      value={itemName}
                      onValueChange={setItemName}
                      placeholder={groupHead ? 'Select part' : 'Choose the group head first'}
                      searchPlaceholder="Search part"
                      emptyText="No part found"
                      disabled={!groupHead}
                      modal
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity {picked?.uom ? `(${picked.uom})` : ''}</Label>
                    <Input type="number" inputMode="decimal" min={0} step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Note (optional)</Label>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. 3/4 inch, left side" />
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={busy || !!addProblem} title={addProblem ?? undefined} onClick={() => void addPart()}>
                  <Plus className="mr-1.5 size-4" /> Add part
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" disabled={busy || toIndent.length === 0} onClick={() => void createIndent(false)}>
                  <ClipboardList className="mr-1.5 size-4" /> Create indent{toIndent.length > 0 ? ` (${toIndent.length})` : ''}
                </Button>
                {toIndent.length === 0 && indentedNotIssued.length > 0 && (
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void createIndent(true)}>
                    Create indent again
                  </Button>
                )}
                {canIssue && parts.total > 0 && (
                  <Button asChild type="button" size="sm" variant="outline">
                    <Link to={`/store/inventory/issue?kind=MAINTENANCE&woId=${encodeURIComponent(wo.id)}`}>
                      <PackageCheck className="mr-1.5 size-4" /> Issue from Store
                    </Link>
                  </Button>
                )}
                {canReturn && hasAnyIssued && (
                  <Button asChild type="button" size="sm" variant="outline" className="text-amber-700 hover:text-amber-800 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900/50">
                    <Link to={`/store/inventory/issue-return?kind=MAINTENANCE&woId=${encodeURIComponent(wo.id)}`}>
                      <RotateCcw className="mr-1.5 size-4" /> Return parts to Store
                    </Link>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The indent goes to the Store with this work order and machine. The Store buys and receives the parts, then issues them to this work order.
                Partial or full issued parts can be used to complete the repair. Unused parts can be returned to inventory via Store Issue Return.
              </p>
            </section>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {workType === 'in_house' && material === true && completeBlock ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3.5" /> {completeBlock}
            </span>
          ) : workType === 'in_house' && material === true && hasAnyIssued && !isFullyIssued ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
              <CheckCircle2 className="size-3.5" /> Partial parts issued — unused parts can be returned to Store
            </span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            {workType === 'outsourced' ? (
              <Button type="button" onClick={() => onContinue(wo, 'out_source')}>
                Continue with vendor details
              </Button>
            ) : (
              <Button
                type="button"
                disabled={material === null || (material === true && !!completeBlock)}
                title={material === null ? 'Say whether material is required first' : completeBlock ?? undefined}
                onClick={() => onContinue(wo, 'in_house')}
              >
                Complete repair…
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
