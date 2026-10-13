import { useState } from 'react';
import { AlertCircle, ArrowLeft, CalendarPlus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useIsDesktop } from '@/features/asset/cost/lib/useIsDesktop';
import { useCostEdit } from '@/features/asset/equipment/lib/useCostAccess';
import { useRecordSummary } from '../server/useRecordQueries';
import type { RecordSummary } from '../types';
import { DocumentsSummaryCard } from '@/features/asset/documents/components/DocumentsSummaryCard';
import { MachineDocumentsPanel } from '@/features/asset/documents/components/MachineDocumentsPanel';
import { HistoryTab } from './HistoryTab';
import { MachineHeaderCard } from './MachineHeaderCard';
import { OverviewMain, OverviewSide } from './OverviewPanels';
import { PartsTab } from './PartsTab';
import { ScheduleDialog } from './ScheduleDialog';
import { ScheduleServiceDialog } from './ScheduleServiceDialog';

const TAB = 'h-11 shrink-0 px-4 lg:h-9';

function Header({ onBack, action }: { onBack: () => void; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Back to maintenance records" onClick={onBack}><ArrowLeft className="size-5" /></Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold leading-tight lg:text-xl">Maintenance Records</h1>
        <p className="text-xs text-muted-foreground lg:text-sm">Track and manage equipment maintenance</p>
      </div>
      {action}
    </div>
  );
}

export default function MachineRecord() {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const { user } = useAuth();
  const isAdmin = useCostEdit();
  const q = useRecordSummary(machineId);
  const [tab, setTab] = useState('overview');
  const [scheduling, setScheduling] = useState(false);
  const [managing, setManaging] = useState<false | 'list' | 'add'>(false);
  const back = () => navigate('/maintenance/records');
  const s: RecordSummary | undefined = q.data;

  if (q.isError && !s) {
    const status = (q.error as { response?: { status?: number } } | null)?.response?.status;
    return (
      <div className="space-y-3">
        <Header onBack={back} action={null} />
        <div role="alert" className="mx-auto grid max-w-md place-items-center gap-3 rounded-xl border p-8 text-center">
          <AlertCircle className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">{status === 404 ? 'Machine not found' : 'Could not load this record'}</p>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/maintenance/records">Back to records</Link></Button>
            {status !== 404 && <Button onClick={() => q.refetch()}>Retry</Button>}
          </div>
        </div>
      </div>
    );
  }
  if (!s) {
    return (
      <div className="space-y-3">
        <Header onBack={back} action={null} />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const me = user?.id !== undefined ? String(user.id) : '';
  const canTick = isAdmin || (!!me && (s.mechanic?.id === me || s.responsible?.id === me));
  const canSchedule = s.canScheduleService && s.schedules.length > 0;
  const actions = { canTick, onSchedule: () => setScheduling(true), onManage: () => setManaging('list'), onAddSchedule: () => setManaging('add') };
  const mid = s.machine.id;
  const scheduleBtn = (cls: string) => canSchedule && (
    <Button className={cls} onClick={() => setScheduling(true)}><CalendarPlus className="size-4" /> Schedule Service</Button>
  );

  return (
    <div className="space-y-3 lg:space-y-4">
      <Header onBack={back} action={desktop ? scheduleBtn('') : null} />
      <MachineHeaderCard machine={s.machine} />

      {desktop ? (
        <>
          <div className="grid grid-cols-3 items-start gap-4">
            <div className="col-span-2"><OverviewMain s={s} a={actions} /></div>
            <div className="space-y-3">
              <OverviewSide s={s} desktop />
              <DocumentsSummaryCard machineId={mid} />
            </div>
          </div>
          <Tabs value={tab === 'overview' ? 'history' : tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="history" className={TAB}>Service History</TabsTrigger>
              <TabsTrigger value="documents" className={TAB}>Documents</TabsTrigger>
              <TabsTrigger value="parts" className={TAB}>Parts Used</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-3"><HistoryTab machineId={mid} unit={s.machine.readingUnit} /></TabsContent>
            <TabsContent value="documents" className="mt-3"><MachineDocumentsPanel machineId={mid} variant="embedded" /></TabsContent>
            <TabsContent value="parts" className="mt-3"><PartsTab machineId={mid} workOrder={s.openServiceWorkOrder} canCost={isAdmin} /></TabsContent>
          </Tabs>
        </>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto">
            <TabsList className="w-max min-w-full">
              <TabsTrigger value="overview" className={TAB}>Overview</TabsTrigger>
              <TabsTrigger value="history" className={TAB}>Service History</TabsTrigger>
              <TabsTrigger value="documents" className={TAB}>Documents</TabsTrigger>
              <TabsTrigger value="parts" className={TAB}>Parts Used</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overview" className="mt-3 space-y-3">
            <OverviewMain s={s} a={actions} />
            <OverviewSide s={s} />
            {canSchedule && (
              <div className="sticky bottom-0 -mx-1 border-t bg-background/95 p-3 backdrop-blur">
                {scheduleBtn('h-12 w-full')}
              </div>
            )}
          </TabsContent>
          <TabsContent value="history" className="mt-3"><HistoryTab machineId={mid} unit={s.machine.readingUnit} /></TabsContent>
          <TabsContent value="documents" className="mt-3"><MachineDocumentsPanel machineId={mid} variant="embedded" /></TabsContent>
          <TabsContent value="parts" className="mt-3"><PartsTab machineId={mid} workOrder={s.openServiceWorkOrder} canCost={isAdmin} /></TabsContent>
        </Tabs>
      )}

      {canSchedule && <ScheduleServiceDialog open={scheduling} onOpenChange={setScheduling} summary={s} />}
      {s.canManageSchedules && <ScheduleDialog open={managing !== false} onOpenChange={(o) => setManaging(o ? managing : false)} summary={s} startAdding={managing === 'add'} />}
    </div>
  );
}
