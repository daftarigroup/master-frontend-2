import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { useCostEdit } from '@/features/asset/equipment/lib/useCostAccess';
import { useIsDesktop } from '@/features/asset/cost/lib/useIsDesktop';
import { usePagination } from '@/hooks/usePagination';
import { toFirmParam } from '@/features/maintenancepro/shared/lib/common';
import { useAssignmentFilters } from '../lib/useAssignmentFilters';
import { useAssignments, useAvailability } from '../server/useAssignmentQueries';
import type { AssignmentAction } from '../types';
import { ActionHost } from './ActionHost';
import { FilterBar, FilterSheetButton, SearchBox } from './AssignmentFilters';
import { AssignedList } from './AssignedList';
import { AssignmentStatTiles } from './AssignmentStatTiles';
import { AssignmentTable } from './AssignmentTable';
import { AvailabilityTimeline } from './AvailabilityTimeline';
import { OperatorList } from './OperatorList';
import { TransferQueue } from './TransferQueue';

/** Assignment Status: where each machine works, who operates it, open transfers and the availability timeline. Route: /maintenance/assignments */
export default function AssignmentStatus() {
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);
  const desktop = useIsDesktop();
  const admin = useCostEdit();
  const { filters, patch, activeCount } = useAssignmentFilters();
  const { page, limit, setPage, setLimit } = usePagination(20);
  const [action, setAction] = useState<AssignmentAction | null>(null);

  const list = useAssignments({
    firmId,
    status: filters.status,
    q: filters.q,
    siteId: filters.siteId,
    overdue: filters.overdue,
    assignedOnly: !desktop,
    limit: desktop ? limit : 100,
    offset: desktop ? (page - 1) * limit : 0,
  });
  const availability = useAvailability(desktop ? 14 : 7, firmId);
  const listError = list.isError;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-3 pb-6 lg:space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold lg:text-2xl">Assignment Status</h1>
          <p className="text-sm text-muted-foreground">Track equipment assignments</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {admin && (
            <Button className="hidden h-10 gap-1.5 lg:inline-flex" onClick={() => setAction({ kind: 'assign' })}>
              <Plus className="size-4" aria-hidden />Assign machine
            </Button>
          )}
          <div className="lg:hidden"><FilterSheetButton filters={filters} patch={patch} activeCount={activeCount} /></div>
        </div>
      </div>

      <SearchBox value={filters.q} onCommit={(q) => patch({ q })} className="lg:hidden" />
      <div className="hidden lg:block"><FilterBar filters={filters} patch={patch} /></div>

      <AssignmentStatTiles stats={list.data?.stats} active={filters.status} onPick={(status) => patch({ status })} loading={list.isLoading} />

      {admin && (
        <Button className="h-11 w-full gap-1.5 lg:hidden" onClick={() => setAction({ kind: 'assign' })}>
          <Plus className="size-4" aria-hidden />Assign machine
        </Button>
      )}

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:items-start lg:gap-4">
        <div className="min-w-0 space-y-3 lg:space-y-4">
          {desktop ? (
            <AssignmentTable data={list.data} loading={list.isLoading} error={listError} onRetry={() => list.refetch()} onAction={setAction} page={page} limit={limit} onPage={setPage} onLimit={setLimit} />
          ) : (
            <AssignedList data={list.data} loading={list.isLoading} error={listError} onRetry={() => list.refetch()} onAction={setAction} />
          )}
        </div>
        <div className="min-w-0 space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0 2xl:block 2xl:space-y-4">
          <TransferQueue onAction={setAction} />
          {!desktop && <AvailabilityTimeline desktop={false} data={availability.data} loading={availability.isLoading} error={availability.isError} onRetry={() => availability.refetch()} />}
          <OperatorList onAction={setAction} />
        </div>
      </div>

      {desktop && <AvailabilityTimeline desktop data={availability.data} loading={availability.isLoading} error={availability.isError} onRetry={() => availability.refetch()} />}

      <ActionHost action={action} onClose={() => setAction(null)} />
    </div>
  );
}
