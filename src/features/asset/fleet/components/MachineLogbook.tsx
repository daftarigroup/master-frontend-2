import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Ban, Fuel, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { apiErrorMessage, fmtDateTime, fmtDay, fmtNum, istToday } from '../lib/format';
import { useMachineHistory, useVoidDiesel, useVoidUsage } from '../server/tanstackQuery/useFleetQueries';
import { CONSUMPTION_LABEL, UNIT_LABEL, type MachineHistory, type UsageLog } from '../types/types';
import { OwnershipBadge } from './OwnershipBadge';

const FLAG_LABEL: Record<string, string> = {
  CONTINUITY_GAP: 'Start ≠ last stop',
  IMPLAUSIBLE_USAGE: 'Unusually high usage',
  METER_RESET: 'Meter reset',
};

type VoidTarget = { kind: 'usage' | 'diesel'; id: string; label: string } | null;

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'warn' | 'bad' }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-bold tabular-nums', tone === 'warn' && 'text-amber-600', tone === 'bad' && 'text-red-600')}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function UsageRows({ rows, unit, onVoid }: { rows: UsageLog[]; unit: string; onVoid: (u: UsageLog) => void }) {
  if (rows.length === 0) return <Card className="p-6 text-center text-sm text-muted-foreground">No entries in this period.</Card>;
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs">
            <tr>
              {['Started', 'Start', 'Stop', 'Usage', 'Operator', 'Flags', ''].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(u.startedAt)}</td>
                <td className="px-3 py-2 tabular-nums">{fmtNum(u.startReading)}</td>
                <td className="px-3 py-2 tabular-nums">{u.isOpen ? <Badge variant="outline">open</Badge> : fmtNum(u.stopReading)}</td>
                <td className="px-3 py-2 tabular-nums font-medium">{u.usage !== null ? `${fmtNum(u.usage)} ${unit}` : '—'}</td>
                <td className="px-3 py-2">{u.operatorName ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {u.flagReasons.map((f) => (
                      <Badge key={f} variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                        {FLAG_LABEL[f] ?? f}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => onVoid(u)}>
                    <Ban className="mr-1 size-3.5" /> Void
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((u) => (
          <Card key={u.id} className="space-y-1.5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{fmtDateTime(u.startedAt)}</span>
              {u.isOpen ? <Badge variant="outline">open</Badge> : <b className="tabular-nums">{fmtNum(u.usage)} {unit}</b>}
            </div>
            <p className="tabular-nums">
              {fmtNum(u.startReading)} → {u.isOpen ? '…' : fmtNum(u.stopReading)}
              {u.operatorName ? <span className="text-muted-foreground"> · {u.operatorName}</span> : null}
            </p>
            {u.flagReasons.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {u.flagReasons.map((f) => (
                  <Badge key={f} variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">{FLAG_LABEL[f] ?? f}</Badge>
                ))}
              </div>
            )}
            <Button size="sm" variant="ghost" className="h-9" onClick={() => onVoid(u)}>
              <Ban className="mr-1 size-3.5" /> Void
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}

function Body({ h, onVoid }: { h: MachineHistory; onVoid: (t: NonNullable<VoidTarget>) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const unit = UNIT_LABEL[h.machine.readingUnit];
  const eff = h.efficiency;
  const lastStop = h.usage.find((u) => u.stopReading !== null)?.stopReading ?? h.machine.openingReading;
  const noMeter = h.machine.readingUnit === 'NONE';
  const dieselTotal = h.diesel.reduce((a, d) => a + d.litres, 0);

  const tabParam = searchParams.get('tab');
  const allowedTabs = noMeter ? ['diesel', 'legacy'] : ['usage', 'diesel', 'flags', 'legacy'];
  const defaultTab = noMeter ? 'diesel' : 'usage';
  const activeTab = tabParam && allowedTabs.includes(tabParam) ? tabParam : defaultTab;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {noMeter ? (
          <Stat label="Diesel (period)" value={`${fmtNum(dieselTotal)} L`} sub="No meter on this machine" />
        ) : (
          <>
            <Stat label="Current reading" value={`${fmtNum(lastStop)} ${unit}`} sub={`Opening ${fmtNum(h.machine.openingReading)}`} />
            <Stat label="Total run" value={`${fmtNum(h.totalRun)} ${unit}`} sub="Opening + all usage" />
            <Stat
              label="Efficiency"
              value={eff.rate !== null ? `${fmtNum(eff.rate, 3)} ${CONSUMPTION_LABEL[h.machine.readingUnit]}` : '—'}
              sub={
                eff.expected !== null
                  ? `Expected ${fmtNum(eff.expected)}${eff.deviationPct !== null ? ` · ${eff.deviationPct > 0 ? '+' : ''}${fmtNum(eff.deviationPct, 1)}%` : ''}`
                  : `${fmtNum(eff.litres)} L over ${fmtNum(eff.usage)} ${unit}`
              }
              tone={eff.flagged ? 'warn' : undefined}
            />
            <Stat label="Flagged entries" value={String(h.flagged.length)} tone={h.flagged.length ? 'warn' : undefined} sub={`${h.range.from} → ${h.range.to}`} />
          </>
        )}
      </div>
      {eff.excludedOpenEntries > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3.5" /> {eff.excludedOpenEntries} open entr{eff.excludedOpenEntries === 1 ? 'y is' : 'ies are'} left out of usage and efficiency until closed.
        </p>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', val);
              return next;
            },
            { replace: true }
          );
        }}
      >
        <TabsList className="flex-wrap">
          {!noMeter && <TabsTrigger value="usage">Usage ({h.usage.length})</TabsTrigger>}
          <TabsTrigger value="diesel">Diesel ({h.diesel.length})</TabsTrigger>
          {!noMeter && <TabsTrigger value="flags">Flags ({h.flagged.length})</TabsTrigger>}
          {h.legacyLogs.length > 0 && <TabsTrigger value="legacy">Legacy logs ({h.legacyLogs.length})</TabsTrigger>}
        </TabsList>
        <TabsContent value="usage" className="mt-3">
          <UsageRows rows={h.usage} unit={unit} onVoid={(u) => onVoid({ kind: 'usage', id: u.id, label: `${fmtDateTime(u.startedAt)}, ${fmtNum(u.startReading)}→${u.isOpen ? '…' : fmtNum(u.stopReading)}` })} />
        </TabsContent>
        <TabsContent value="diesel" className="mt-3">
          {h.diesel.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No diesel issued in this period.</Card>
          ) : (
            <div className="divide-y rounded-lg border">
              {h.diesel.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-medium tabular-nums">
                      {fmtNum(d.litres)} L
                      {d.meterReading != null && <span className="ml-2 text-xs font-normal text-muted-foreground">at {fmtNum(d.meterReading)} {unit}</span>}
                      {(d.flags?.length ?? 0) > 0 && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" title="The meter reading looks wrong: saved, please check it">
                          check reading
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(d.issuedAt)} · {d.fromStore ? 'Store issue' : d.source}
                      {d.note ? ` · ${d.note}` : ''}
                    </p>
                  </div>
                  {d.fromStore ? (
                    <span className="text-xs text-muted-foreground">Change it in Store Data</span>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => onVoid({ kind: 'diesel', id: d.id, label: `${fmtNum(d.litres)} L on ${fmtDateTime(d.issuedAt)}` })}>
                      <Ban className="mr-1 size-3.5" /> Void
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="flags" className="mt-3">
          <UsageRows rows={h.flagged} unit={unit} onVoid={(u) => onVoid({ kind: 'usage', id: u.id, label: fmtDateTime(u.startedAt) })} />
        </TabsContent>
        <TabsContent value="legacy" className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">Old daily logs, kept read-only. Their hours are already inside the opening reading.</p>
          <div className="divide-y rounded-lg border">
            {h.legacyLogs.map((l) => (
              <div key={l.id} className="flex justify-between gap-3 p-3 text-sm">
                <span>{fmtDay(l.date)}</span>
                <span className="tabular-nums">{fmtNum(l.runtimeHours)} hrs</span>
                <span className="truncate text-muted-foreground">{l.operatorName ?? ''}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function MachineLogbook() {
  const { machineId } = useParams();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(istToday());
  const q = useMachineHistory(machineId, { from: from || undefined, to: to || undefined });
  const voidUsage = useVoidUsage();
  const voidDiesel = useVoidDiesel();
  const [target, setTarget] = useState<VoidTarget>(null);
  const [reason, setReason] = useState('');

  const confirmVoid = async () => {
    if (!target || reason.trim().length < 3) return;
    try {
      await (target.kind === 'usage' ? voidUsage : voidDiesel).mutateAsync({ id: target.id, reason: reason.trim() });
      toast.success('Entry voided');
      setTarget(null);
      setReason('');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not void the entry'));
    }
  };

  const h = q.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/asset/work-logs"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-bold">
              <Gauge className="size-5 text-blue-600" /> {h?.machine.name ?? 'Machine logbook'}
              {h && <OwnershipBadge value={h.machine.ownershipType} />}
            </h1>
            <p className="text-xs text-muted-foreground">Meter readings and diesel for this machine</p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">From</Label>
            <Input type="date" value={from || h?.range.from || ''} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">To</Label>
            <Input type="date" value={to} max={istToday()} onChange={(e) => setTo(e.target.value)} className="h-10" />
          </div>
          <Button asChild className="h-10">
            <Link to="/asset/work-logs"><Fuel className="mr-1.5 size-4" /> Work Logs</Link>
          </Button>
        </div>
      </div>

      {q.isLoading && <Card className="p-6 text-center text-sm text-muted-foreground">Loading…</Card>}
      {q.isError && <Card className="p-4 text-sm text-destructive">{apiErrorMessage(q.error, 'Could not load this machine')}</Card>}
      {h && <Body h={h} onVoid={setTarget} />}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this entry?</DialogTitle>
            <DialogDescription>{target?.label}. It stays on record but no longer counts in usage, efficiency or the ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="void-reason">Reason</Label>
            <Input id="void-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="At least 3 characters" className="h-11" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={reason.trim().length < 3 || voidUsage.isPending || voidDiesel.isPending} onClick={confirmVoid}>
              Void entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MachineLogbook;
