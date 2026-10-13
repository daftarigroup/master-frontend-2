'use client';
import { AlertTriangle, ClipboardList, Fuel, Loader2, Siren, Wrench } from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { FleetAlertsCard } from '@/features/asset/fleet/components/FleetAlertsCard';
import { fmtNum } from '@/features/asset/fleet/lib/format';
import { useProject } from '@/context/ProjectContext';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { priorityBadge, priorityLabel, toFirmParam } from '../../shared/lib/common';
import {
  useDieselThisMonth,
  useMachinesDown,
  useOpenBreakdowns,
  useOverdueWorkOrders,
  useWoStats,
} from '../hooks/useLeanDashboard';

function Tile({
  label,
  value,
  to,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string | number | undefined;
  to: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  loading: boolean;
}) {
  return (
    <Link to={to} className="block">
      <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
        <div className={cn('rounded-lg p-2', tone)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">
            {loading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : (value ?? '—')}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export default function MaintenanceProDashboard() {
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);

  const stats = useWoStats(firmId);
  const overdue = useOverdueWorkOrders(firmId);
  const breakdowns = useOpenBreakdowns(firmId);
  const down = useMachinesDown(firmId);
  const diesel = useDieselThisMonth(firmId);

  const attention = [
    ...(overdue.data ?? []).map((w) => ({
      key: `wo-${w.id}`,
      to: '/maintenance/work-orders',
      title: w.title || w.workOrderCode || 'Work order',
      sub: `Overdue${w.machine?.name ? ` · ${w.machine.name}` : ''}`,
      badge: w.priority ? { text: priorityLabel(w.priority), cls: priorityBadge(w.priority) } : null,
    })),
    ...(breakdowns.data?.items ?? []).map((b) => ({
      key: `bd-${b.id}`,
      to: '/maintenance/work-orders?tab=breakdown',
      title: b.machineName,
      sub: `Breakdown · ${b.description}`,
      badge: { text: b.severity, cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    })),
  ].slice(0, 8);

  const loadingAttention = overdue.isLoading || breakdowns.isLoading;

  return (
    <div className="space-y-4 p-1">
      <h1 className="text-xl font-bold">Maintenance</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile
          label="Open work orders"
          value={stats.data?.pending}
          to="/maintenance/work-orders"
          icon={ClipboardList}
          tone="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
          loading={stats.isLoading}
        />
        <Tile
          label="Overdue work orders"
          value={stats.data?.overdue}
          to="/maintenance/work-orders"
          icon={AlertTriangle}
          tone="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
          loading={stats.isLoading}
        />
        <Tile
          label="Open breakdowns"
          value={breakdowns.data?.total}
          to="/maintenance/work-orders?tab=breakdown"
          icon={Siren}
          tone="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          loading={breakdowns.isLoading}
        />
        <Tile
          label="Machines down"
          value={down.data}
          to="/maintenance/machines"
          icon={Wrench}
          tone="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
          loading={down.isLoading}
        />
        <Tile
          label="Diesel issued this month (L)"
          value={diesel.data === undefined ? undefined : fmtNum(diesel.data)}
          to="/maintenance/reports"
          icon={Fuel}
          tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          loading={diesel.isLoading}
        />
      </div>

      <FleetAlertsCard />

      <Card className="space-y-2 p-4">
        <h3 className="text-sm font-bold">Needs attention</h3>
        {loadingAttention ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue work orders or open breakdowns.</p>
        ) : (
          <ul className="divide-y">
            {attention.map((a) => (
              <li key={a.key}>
                <Link to={a.to} className="flex items-center justify-between gap-3 py-2 hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
                  </div>
                  {a.badge && (
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', a.badge.cls)}>
                      {a.badge.text}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          <Link to="/maintenance/approvals" className="underline">
            Approvals
          </Link>
          <Link to="/maintenance/reports" className="underline">
            Reports
          </Link>
        </div>
      </Card>
    </div>
  );
}
