import { BarChart3, ExternalLink, Fuel, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { CATEGORY_LABEL } from '../lib/labels';
import { formatINR, formatQty } from '../lib/money';
import { detailPath } from '../lib/paths';
import { useEquipmentSummary } from '../server/useEquipmentQueries';
import type { EquipmentItem } from '../types';
import { EquipmentPhoto } from './EquipmentPhoto';
import { StatusPill } from './StatusPill';
import { UtilizationMeter } from './UtilizationMeter';

interface Props {
  /** The row that was clicked; shown straight away while the fuller summary loads. */
  item: EquipmentItem | null;
  month?: string;
  canCost: boolean;
  onClose: () => void;
  onQr: (item: EquipmentItem) => void;
}

const day = (d: string | null | undefined) => (d ? d.split('T')[0].split('-').reverse().join('-') : '—');

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

/** Desktop right-hand drawer: key facts, this month's usage and (for permitted roles) a mini cost summary. */
export function EquipmentDrawer({ item, month, canCost, onClose, onQr }: Props) {
  const navigate = useNavigate();
  const summary = useEquipmentSummary(item?.id ?? null, month);
  const m = summary.data ?? item;

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
        {m && (
          <>
            <SheetHeader className="space-y-0 border-b p-4 text-left">
              <div className="flex gap-3">
                <EquipmentPhoto src={m.imageUrl} category={m.category} name={m.name} className="size-20" />
                <div className="min-w-0 pr-6">
                  <SheetTitle className="truncate text-base">{m.name}</SheetTitle>
                  <SheetDescription asChild>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-primary">{m.assetCode}</span>
                      <StatusPill status={m.status} />
                      <OwnershipBadge value={m.ownershipType} />
                    </div>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5 p-4">
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key facts</h3>
                <dl>
                  <Fact label="Category">{CATEGORY_LABEL[m.category]}</Fact>
                  <Fact label="Registration">{m.registrationNo ?? '—'}</Fact>
                  <Fact label="Site">{m.site ?? '—'}</Fact>
                  {m.ownershipType === 'RENTED' && <Fact label="Vendor">{m.vendor ?? '—'}</Fact>}
                  {m.ownershipType === 'RENTED' && <Fact label="Hire type">{m.hireType === 'WET' ? 'Wet rate (vendor supplies diesel)' : m.hireType === 'DRY' ? 'Dry rate' : '—'}</Fact>}
                  <Fact label="Last reading">{m.unit ? `${formatQty(m.lastReading, 2)} ${m.unit}` : '—'}</Fact>
                  <Fact label="Last diesel">{day(m.lastDieselDate)}</Fact>
                </dl>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This month</h3>
                {summary.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">Hours / Km</div>
                        <div className="text-lg font-bold tabular-nums">{m.unit ? `${formatQty(m.hoursThisMonth ?? 0)} ${m.unit}` : '—'}</div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">Fuel efficiency</div>
                        <div className="text-lg font-bold tabular-nums">{m.efficiency ? `${m.efficiency.value} ${m.efficiency.unit}` : '—'}</div>
                      </div>
                    </div>
                    <UtilizationMeter variant="bar" percent={m.utilization.percent} overShift={m.utilization.overShift} />
                  </>
                )}
              </section>

              {canCost && m.monthSpend !== undefined && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cost this month</h3>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Total spend</div>
                    <div className="text-xl font-bold tabular-nums">{formatINR(m.monthSpend)}</div>
                    {m.dataComplete === false && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Some figures are estimated or missing: open Cost Tracking to see what to fix.</p>}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => navigate(detailPath(m))}><ExternalLink className="size-4" /> Open</Button>
                {canCost && <Button variant="outline" onClick={() => navigate(`/asset/equipment/${m.id}/cost`)}><BarChart3 className="size-4" /> Cost tracking</Button>}
                <Button variant="outline" onClick={() => navigate(`/asset/work-logs?machineId=${m.id}&new=1`)}><Fuel className="size-4" /> Work log</Button>
                <Button variant="outline" onClick={() => onQr(m)}><QrCode className="size-4" /> QR tag</Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default EquipmentDrawer;
