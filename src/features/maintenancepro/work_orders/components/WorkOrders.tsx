import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { usePagination } from '@/hooks/usePagination';
import { toFirmParam } from '../../shared/lib/common';
import ProcessModal from '../../repair_tasks/components/ProcessModal';
import ViewModal from '../../repair_tasks/components/ViewModal';
import { useReportWorkOrder, useSkipWorkOrder } from '../../unique_task/server/tanstackQuery/useWorkOrdersQueries';
import type { OutsourceStage, WorkOrderKind, WorkOrderListParams, WorkOrderRow } from '../server/api/workOrdersApi';
import {
  useCancelWorkOrder,
  useMachineOptions,
  useWorkOrderList,
} from '../server/tanstackQuery/useWorkOrderActions';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog';
import { RepairPlanDialog } from './RepairPlanDialog';
import { OutsourceActionDialog, type OutsourceAction } from './OutsourceActionDialog';
import { ReassignDialog } from './ReassignDialog';
import type { RowHandlers } from './WorkOrderRowActions';
import { WorkOrderStatsStrip } from './WorkOrderStatsStrip';
import { WorkOrderCards, WorkOrdersTable } from './WorkOrdersTable';
import { STAGES, TAB_TYPE, toastError, type TabKey } from './workOrderUtils';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Maintenance' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'repair', label: 'Repair' },
  { key: 'outsourced', label: 'Outsourced' },
];

// Task views: whose work orders to show. A site user always sees only their own; an admin can also see everything.
const VIEWS = [
  { key: 'assigned', label: 'Assigned to me' },
  { key: 'responsible', label: "I'm responsible" },
  { key: 'created', label: 'Created by me' },
  { key: 'all', label: 'All' },
] as const;
type ViewKey = (typeof VIEWS)[number]['key'];

const ALL_MACHINES = '__all__';
type ConfirmKind = 'done' | 'skip' | 'cancel';

const CONFIRM_COPY: Record<ConfirmKind, { title: string; confirm: string; reason?: string; required?: boolean }> = {
  done: { title: 'Mark as done', confirm: 'Mark done', reason: 'Completion note (optional)' },
  skip: { title: 'Skip this work order', confirm: 'Skip', reason: 'Reason for skipping', required: true },
  cancel: { title: 'Cancel this work order', confirm: 'Cancel work order', reason: 'Reason for cancelling', required: true },
};

function tabFromParams(sp: URLSearchParams): TabKey {
  const tab = sp.get('tab')?.toLowerCase();
  if (TABS.some((t) => t.key === tab)) return tab as TabKey;
  const type = sp.get('type')?.toUpperCase();
  if (type === 'REPAIR') return 'repair';
  if (type === 'BREAKDOWN') return 'breakdown';
  if (type === 'SCHEDULED') return 'scheduled';
  return 'all';
}

export default function WorkOrders() {
  const [sp, setSp] = useSearchParams();
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);
  const { page, limit, setPage, setLimit } = usePagination(20);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const tab = tabFromParams(sp);
  const viewParam = sp.get('view');
  const view: ViewKey = VIEWS.some((v) => v.key === viewParam) ? (viewParam as ViewKey) : 'all';
  const stageParam = sp.get('status')?.toUpperCase();
  const stage = STAGES.find((s) => s.value === stageParam)?.value as OutsourceStage | undefined;
  const machineId = sp.get('machine') || sp.get('machineId') || '';
  const overdueOnly = sp.get('overdue') === 'true';
  const waitingParts = sp.get('waiting') === 'parts';
  const search = sp.get('q') ?? '';
  const createOpen = sp.get('new') === '1' || sp.get('new') === 'true';

  const [searchText, setSearchText] = useState(search);
  useEffect(() => setSearchText(search), [search]);

  const patch = (changes: Record<string, string | null>, resetPage = true) =>
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, v)));
        if (resetPage) next.set('page', '1');
        return next;
      },
      { replace: true }
    );

  // Debounce the search box into the URL.
  useEffect(() => {
    if (searchText === search) return;
    const t = setTimeout(() => patch({ q: searchText.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const params: WorkOrderListParams = useMemo(
    () => ({
      page,
      limit,
      firmId,
      type: TAB_TYPE[tab],
      machineId: machineId || undefined,
      search: search || undefined,
      overdue: overdueOnly || undefined,
      waitingParts: waitingParts || undefined,
      view: view === 'all' ? undefined : view,
      ...(tab === 'outsourced' ? (stage ? { outsourceStatus: stage } : { outsourced: true }) : {}),
    }),
    [page, limit, firmId, tab, machineId, search, overdueOnly, waitingParts, stage, view]
  );

  const { data, isLoading, isFetching, isError } = useWorkOrderList(params);
  const { machines, ownership } = useMachineOptions(firmId);
  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const [viewWo, setViewWo] = useState<WorkOrderRow | null>(null);
  const [planWo, setPlanWo] = useState<WorkOrderRow | null>(null); // the repair steps (work type, material, parts)
  const [processWo, setProcessWo] = useState<{ wo: WorkOrderRow; presetType: 'in_house' | 'out_source' } | null>(null);
  const [stageDlg, setStageDlg] = useState<{ wo: WorkOrderRow; action: OutsourceAction } | null>(null);
  const [confirm, setConfirm] = useState<{ wo: WorkOrderRow; kind: ConfirmKind } | null>(null);
  const [reassignWo, setReassignWo] = useState<WorkOrderRow | null>(null);

  const report = useReportWorkOrder();
  const skip = useSkipWorkOrder();
  const cancel = useCancelWorkOrder();
  const busy = report.isPending || skip.isPending || cancel.isPending;

  const handlers: RowHandlers = {
    onView: setViewWo,
    onProcess: setPlanWo,
    onDone: (wo) => setConfirm({ wo, kind: 'done' }),
    onSkip: (wo) => setConfirm({ wo, kind: 'skip' }),
    onCancel: (wo) => setConfirm({ wo, kind: 'cancel' }),
    onStage: (wo, action) => setStageDlg({ wo, action }),
    onReassign: setReassignWo,
    mayReassign: (wo) => isAdmin || (!!user?.id && wo.responsibleId === String(user.id)) || (!wo.responsibleId && !!user?.id && wo.currentAssigneeId === String(user.id)),
  };

  const runConfirm = async (reason: string) => {
    if (!confirm) return;
    const { wo, kind } = confirm;
    try {
      if (kind === 'done') await report.mutateAsync({ id: wo.id, data: { workDone: reason || undefined } });
      else if (kind === 'skip') await skip.mutateAsync({ id: wo.id, skipReason: reason });
      else await cancel.mutateAsync({ id: wo.id, reason });
      toast.success(kind === 'done' ? 'Marked done' : kind === 'skip' ? 'Work order skipped' : 'Work order cancelled');
      setConfirm(null);
    } catch (e) {
      toastError(e, 'Action failed');
    }
  };

  const copy = confirm ? CONFIRM_COPY[confirm.kind] : null;
  const defaultType =
    (sp.get('type')?.toUpperCase() as WorkOrderKind | undefined) ??
    (tab === 'breakdown' ? 'BREAKDOWN' : tab === 'repair' ? 'REPAIR' : tab === 'scheduled' ? 'SCHEDULED' : undefined);

  return (
    <div className="space-y-4 p-4 md:p-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Work Orders</h1>
          <p className="text-xs text-muted-foreground">Maintenance, breakdown and repair jobs, including work sent to vendors</p>
        </div>
        <Button onClick={() => patch({ new: '1' }, false)}>
          <Plus className="mr-1.5 size-4" /> New work order
        </Button>
      </div>

      <WorkOrderStatsStrip firmId={firmId} />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Whose work orders">
        {VIEWS.map((v) => (
          <Button
            key={v.key}
            size="sm"
            variant={view === v.key ? 'default' : 'outline'}
            className="rounded-lg text-xs font-medium"
            aria-pressed={view === v.key}
            onClick={() => patch({ view: v.key === 'all' ? null : v.key })}
          >
            {v.key === 'all' && !isAdmin ? 'Everything I can see' : v.label}
          </Button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => patch({ tab: v === 'all' ? null : v, type: null, status: null })}>
        <div className="overflow-x-auto py-0.5">
          <TabsList className="bg-muted/70 p-1 rounded-xl gap-1.5 border border-border/40 shadow-xs">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {tab === 'outsourced' && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-xs font-medium text-muted-foreground mr-1 hidden sm:inline-block">Stage:</span>
          {[{ value: '', label: 'All' }, ...STAGES].map((s) => (
            <Button
              key={s.value || 'all'}
              size="sm"
              variant={(stage ?? '') === s.value ? 'default' : 'outline'}
              className="rounded-lg text-xs h-7 px-2.5"
              onClick={() => patch({ status: s.value || null })}
            >
              {s.label}
            </Button>
          ))}
        </div>
      )}

      <Card className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search code, title or machine"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="md:w-64">
          <SearchableSelect
            options={[
              { value: ALL_MACHINES, label: 'All machines' },
              ...machines.map((m) => ({ value: String(m.id), label: m.name, sublabel: m.assetCode, keywords: [m.assetCode] })),
            ]}
            value={machineId || ALL_MACHINES}
            onValueChange={(v) => patch({ machine: v === ALL_MACHINES ? null : v })}
            placeholder="All machines"
            searchPlaceholder="Search machines"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={overdueOnly} onCheckedChange={(c) => patch({ overdue: c ? 'true' : null })} />
          Overdue only
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={waitingParts} onCheckedChange={(c) => patch({ waiting: c ? 'parts' : null })} />
          Waiting for parts
        </label>
      </Card>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading work orders...</Card>
      ) : isError ? (
        <Card className="p-8 text-center text-sm text-destructive">Could not load work orders.</Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No work orders match these filters.</Card>
      ) : (
        <div className={cn('min-w-0', isFetching && 'opacity-70 transition-opacity')}>
          <WorkOrdersTable rows={rows} ownership={ownership} handlers={handlers} />
          <WorkOrderCards rows={rows} ownership={ownership} handlers={handlers} />
        </div>
      )}

      <PaginationBar
        page={pagination?.page ?? page}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setPage}
        pageSize={limit}
        onPageSizeChange={setLimit}
      />

      {viewWo && <ViewModal wo={viewWo} onClose={() => setViewWo(null)} />}
      <RepairPlanDialog
        wo={planWo ? rows.find((r) => r.id === planWo.id) ?? planWo : null}
        onClose={() => setPlanWo(null)}
        onContinue={(wo, type) => {
          setPlanWo(null);
          setProcessWo({ wo: rows.find((r) => r.id === wo.id) ?? wo, presetType: type });
        }}
      />
      {processWo && (
        <ProcessModal
          wo={processWo.wo}
          presetType={processWo.presetType}
          onClose={() => setProcessWo(null)}
          onSuccess={() => {
            toast.success('Repair processed');
            setProcessWo(null);
          }}
        />
      )}

      <ReassignDialog wo={reassignWo} onClose={() => setReassignWo(null)} />

      <OutsourceActionDialog wo={stageDlg?.wo ?? null} action={stageDlg?.action ?? null} onClose={() => setStageDlg(null)} />

      <ConfirmActionDialog
        open={!!confirm}
        title={copy?.title ?? ''}
        description={confirm ? `${confirm.wo.workOrderCode ?? ''} ${confirm.wo.title ?? confirm.wo.plan?.title ?? ''}`.trim() : ''}
        reasonLabel={copy?.reason}
        reasonRequired={copy?.required}
        confirmLabel={copy?.confirm ?? 'Confirm'}
        destructive={confirm?.kind !== 'done'}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
      />

      <CreateWorkOrderDialog
        open={createOpen}
        defaultType={defaultType}
        defaultMachineId={machineId || undefined}
        onClose={() => patch({ new: null }, false)}
      />
    </div>
  );
}
