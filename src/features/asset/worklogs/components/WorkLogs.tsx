import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCheck, Columns3, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DateNavigator } from '@/components/shared/DateNavigator';
import { formatDayLong } from '@/lib/dayFormat';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useProject } from '@/context/ProjectContext';
import { apiErrorMessage, istToday } from '@/features/asset/fleet/lib/format';
import { toFirmParam } from '@/features/maintenancepro/shared/lib/common';
import { usePagination } from '@/hooks/usePagination';
import { cn } from '@/lib/utils';
import { COLUMNS, useColumnPrefs, type ColumnId } from '../lib/columns';
import { addDays } from '../lib/format';
import { useBulkApprove, usePickerMachines, useWorkLogPrefill, useWorkLogs } from '../server/useWorkLogQueries';
import { workLogsApi } from '../server/workLogsApi';
import type { BulkApproveResult, WorkLog } from '../types';
import { KpiStrip } from './KpiStrip';
import { useLogActions } from './useLogActions';
import { LogCard } from './LogCard';
import { LogTable } from './LogTable';
import { MachineDropdown } from './MachineCard';
import { WorkLogFormSheet, type FormTarget } from './WorkLogFormSheet';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Daily Work Logs. Phone: one machine, one day, as cards. Desktop (lg+): the same data as a table, plus a day sheet across machines.
 * The URL holds machine, date and view (?machineId=&date=&view=all&range=week); ?new=1 opens the Add form once.
 */
export function WorkLogs() {
  const [params, setParams] = useSearchParams();
  const { page, limit, setPage, setLimit } = usePagination(50);
  const today = istToday();
  const dateParam = params.get('date') ?? '';
  const date = DATE_RE.test(dateParam) ? dateParam : today;
  const allMachines = params.get('view') === 'all';
  const week = params.get('range') === 'week';
  const machineParam = params.get('machineId') ?? '';

  const patch = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);

  const machinesQ = usePickerMachines(firmId);
  const machines = useMemo(() => machinesQ.data ?? [], [machinesQ.data]);
  // a phone always works on one machine, so default to the first one
  useEffect(() => {
    if (!machineParam && !allMachines && machines.length > 0) patch({ machineId: machines[0].id });
  }, [machineParam, allMachines, machines, patch]);
  const machineId = allMachines ? '' : machineParam;
  const machine = machines.find((m) => m.id === machineParam);
  const prefillQ = useWorkLogPrefill(machineId || undefined);

  const listQ = useWorkLogs(
    { firmId, machineId: machineId || undefined, ...(week ? { from: addDays(date, -6), to: date } : { date }), limit, offset: (page - 1) * limit },
    allMachines || !!machineId,
  );
  const rows = useMemo(() => listQ.data?.rows ?? [], [listQ.data]);
  const total = listQ.data?.total ?? 0;
  const kpis = listQ.data?.kpis;

  // ---- add / edit
  const [target, setTarget] = useState<FormTarget | null>(null);
  const seq = useRef(0);
  const openAdd = (id: string) => setTarget({ key: ++seq.current, mode: 'add', machineId: id });
  const openEdit = (log: WorkLog) => setTarget({ key: ++seq.current, mode: 'edit', log });
  const openEditById = (id: string) => {
    workLogsApi.get(id).then(openEdit, (e) => toast.error(apiErrorMessage(e, 'Could not open that work log')));
  };
  const wantsNew = params.get('new') === '1';
  useEffect(() => {
    if (!wantsNew || !machineParam || machinesQ.isLoading) return;
    openAdd(machineParam);
    patch({ new: null });
  }, [wantsNew, machineParam, machinesQ.isLoading, patch]);

  const { handlers, dialog } = useLogActions(openEdit);

  // ---- bulk approve (desktop table)
  const bulk = useBulkApprove();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkApproveResult | null>(null);
  const chosen = rows.filter((r) => r.canApprove && selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(rows.filter((r) => r.canApprove).map((r) => r.id)) : new Set());
  const runBulk = async () => {
    if (bulk.isPending || chosen.length === 0) return;
    try {
      const r = await bulk.mutateAsync(chosen.map((c) => c.id));
      setSelected(new Set());
      if (r.failed.length > 0) setBulkResult(r);
      else toast.success(`${r.approved.length} work logs approved`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not approve the selected logs'));
    }
  };

  const { cols, toggle: toggleCol } = useColumnPrefs();
  const effectiveCols: ColumnId[] = allMachines && !cols.includes('machine') ? ['machine', ...cols] : cols;
  const addTarget = machineParam || machines[0]?.id || '';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-24 sm:p-4 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold sm:text-xl">Daily Work Logs</h1>
        <Button type="button" className="hidden h-11 lg:inline-flex" disabled={!addTarget} onClick={() => openAdd(addTarget)}>
          <Plus className="mr-1.5 size-4" aria-hidden /> Add Work Log
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-center">
        <MachineDropdown
          machine={machine}
          capacity={prefillQ.data?.machine.capacityLabel}
          loading={machinesQ.isLoading}
          allMachines={allMachines}
          machines={machines}
          onSelectMachine={(id) => patch({ machineId: id, view: null })}
          onSelectAllMachines={() => patch({ view: 'all' })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <DateNavigator className="w-full sm:w-auto sm:min-w-[16rem]" value={date} max={today} onChange={(d) => patch({ date: d === today ? null : d })} />
          <Button type="button" className="h-11 w-full sm:w-auto lg:hidden" disabled={!addTarget} onClick={() => openAdd(addTarget)}>
            <Plus className="mr-1.5 size-4" aria-hidden /> Add Work Log
          </Button>
        </div>
      </div>

      <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 lg:flex">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={allMachines} onCheckedChange={(v) => patch({ view: v ? 'all' : null })} aria-label="All machines (day sheet)" />
          All machines (day sheet)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={week} onCheckedChange={(v) => patch({ range: v ? 'week' : null })} aria-label="Show the last 7 days" />
          Last 7 days
        </label>
        <span className="text-sm text-muted-foreground">{week ? `${formatDayLong(addDays(date, -6))} to ${formatDayLong(date)}` : formatDayLong(date)}</span>
        <div className="ml-auto flex items-center gap-2">
          {chosen.length > 0 && (
            <Button type="button" variant="outline" className="h-10" disabled={bulk.isPending} onClick={() => void runBulk()}>
              <CheckCheck className="mr-1.5 size-4" aria-hidden /> {bulk.isPending ? 'Approving…' : `Approve ${chosen.length} selected`}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="h-10">
                <Columns3 className="mr-1.5 size-4" aria-hidden /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem key={c.id} checked={effectiveCols.includes(c.id)} disabled={c.id === 'machine' && allMachines} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol(c.id)}>
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <KpiStrip kpis={kpis} loading={listQ.isLoading} desktop />

      {machinesQ.isError ? (
        <ErrorBox message={apiErrorMessage(machinesQ.error, 'Could not load machines')} onRetry={() => void machinesQ.refetch()} />
      ) : listQ.isError ? (
        <ErrorBox message={apiErrorMessage(listQ.error, 'Could not load work logs')} onRetry={() => void listQ.refetch()} />
      ) : listQ.isLoading || (!allMachines && !machineId && machinesQ.isLoading) ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="font-semibold">{machines.length === 0 && !allMachines ? 'No machines to log work for' : 'No work logs here yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{week ? 'Nothing in these 7 days.' : `Nothing recorded for ${formatDayLong(date)}.`}</p>
          {addTarget && (
            <Button type="button" variant="outline" className="mt-3 h-11" onClick={() => openAdd(addTarget)}>
              <Plus className="mr-1.5 size-4" aria-hidden /> Add Work Log
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className={cn('space-y-3 lg:hidden', listQ.isFetching && 'opacity-70')}>
            {rows.map((log, i) => (
              <LogCard key={log.id} log={log} index={(page - 1) * limit + i + 1} showMachine={allMachines} handlers={handlers} />
            ))}
          </div>
          <div className={cn('hidden lg:block', listQ.isFetching && 'opacity-70')}>
            <LogTable rows={rows} cols={effectiveCols} handlers={handlers} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
          </div>
          <PaginationBar page={page} totalPages={Math.max(1, Math.ceil(total / limit))} onPageChange={setPage} pageSize={limit} onPageSizeChange={setLimit} />
        </>
      )}

      <WorkLogFormSheet target={target} date={date} machines={machines} onClose={() => setTarget(null)} onEditById={openEditById} />
      {dialog}
      {bulkResult && (
        <Dialog open onOpenChange={(o) => !o && setBulkResult(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{bulkResult.approved.length} approved, {bulkResult.failed.length} not approved</DialogTitle>
              <DialogDescription>These were left as they were:</DialogDescription>
            </DialogHeader>
            <ul className="max-h-60 space-y-1.5 overflow-y-auto text-sm">
              {bulkResult.failed.map((f) => (
                <li key={f.id}>
                  <b>{rows.find((r) => r.id === f.id)?.logNumber ?? f.id}</b>: {f.reason}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" className="h-11" onClick={() => setBulkResult(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <div className="sr-only" role="status" aria-live="polite">{listQ.isFetching ? 'Loading work logs' : ''}</div>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertCircle className="size-6 text-destructive" aria-hidden />
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" variant="outline" className="h-11" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export default WorkLogs;
