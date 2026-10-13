import { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  MapPin,
  Package,
  Shield,
  TrendingDown,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { FleetSnapshotCard } from '@/features/asset/equipment/components/FleetSnapshotCard';
import { FleetAlertsCard } from '@/features/asset/fleet/components/FleetAlertsCard';
import { useAssets } from '../server/tanstackQuery/useAssetQueries';
import { CATEGORY_COLORS, formatCurrency, STATUS_COLORS, type Asset, type AssetCategory } from '../types/types';

const wrap = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  trend,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  tone: 'blue' | 'green' | 'amber' | 'violet';
  trend?: { dir: 'up' | 'down'; val: string };
}) {
  const cfg = {
    blue: {
      bg: 'bg-blue-500/8 border-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/15',
      accent: 'bg-blue-500',
    },
    green: {
      bg: 'bg-emerald-500/8 border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/15',
      accent: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-amber-500/8 border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/15',
      accent: 'bg-amber-500',
    },
    violet: {
      bg: 'bg-violet-500/8 border-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-500/15',
      accent: 'bg-violet-500',
    },
  }[tone];

  return (
    <motion.div variants={fadeUp}>
      <Card
        className={cn('border shadow-xs hover:shadow-md transition-all overflow-hidden', cfg.bg)}
      >
        <div className={cn('h-0.5 w-full', cfg.accent)} />
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <div className={cn('rounded-xl p-2', cfg.iconBg)}>
              <Icon className={cn('h-4 w-4', cfg.text)} />
            </div>
          </div>
          <p className={cn('text-3xl font-black tabular-nums leading-none', cfg.text)}>{value}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">{sub}</p>
            {trend && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-[11px] font-bold',
                  trend.dir === 'up' ? 'text-emerald-500' : 'text-rose-500'
                )}
              >
                {trend.dir === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.val}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AssetDashboard() {
  const { selectedProject, effectivePermittedFirms } = useProject();

  const queryFirmId = useMemo(() => {
    if (selectedProject && selectedProject.id !== 'all') {
      return String(selectedProject.id);
    }
    if (effectivePermittedFirms && effectivePermittedFirms.length === 1) {
      return effectivePermittedFirms[0];
    }
    return undefined;
  }, [selectedProject, effectivePermittedFirms]);

  const { data: rawAssets = [] } = useAssets(queryFirmId ? { firmId: queryFirmId } : undefined);
  const assets = useMemo<Asset[]>(() => {
    return filterByFirmAccess(rawAssets, effectivePermittedFirms);
  }, [rawAssets, effectivePermittedFirms]);

  const total = assets.length;
  const active = assets.filter((a) => a.status === 'Active').length;
  const underRepair = assets.filter((a) => a.status === 'Under Repair').length;
  const inactive = assets.filter((a) => a.status === 'Inactive').length;
  const maintenanceDue = assets.filter((a) => a.maintenanceRequired === 'Yes').length;
  const ownedAssets = assets.filter((a) => a.ownershipType !== 'RENTED');
  const owned = ownedAssets.length;
  const rented = total - owned;
  // Rented assets carry no cost/book value, so value and cost are owned-only.
  const costVisible = assets.some((a) => a.cost !== undefined); // the API omits cost for users without cost access
  const totalValue = costVisible ? ownedAssets.reduce((s, a) => s + (a.assetValue ?? 0), 0) : undefined;
  const totalCost = costVisible ? ownedAssets.reduce((s, a) => s + (a.cost ?? 0), 0) : undefined;
  const warrantyExpiring = assets.filter(
    (a) =>
      a.warrantyAvailable === 'Yes' &&
      a.warrantyEnd &&
      new Date(a.warrantyEnd) < new Date('2027-06-01')
  ).length;

  const categoryMap: Record<string, number> = {};
  for (const a of assets) {
    categoryMap[a.category] = (categoryMap[a.category] || 0) + 1;
  }
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const defaultCategories: AssetCategory[] = ['Machinery', 'IT', 'Electronics', 'Tools', 'Vehicle'];
  const displayCategoryEntries: [string, number][] =
    categoryEntries.length > 0 ? categoryEntries : defaultCategories.map((c) => [c, 0]);

  const deptMap: Record<string, number> = {};
  for (const a of assets) {
    deptMap[a.department] = (deptMap[a.department] || 0) + 1;
  }
  const deptEntries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
  const topDept = deptEntries[0]?.[0];
  const defaultDepts = ['Mechanical', 'Electrical', 'Production', 'Operations'];
  const displayDeptEntries: [string, number][] =
    deptEntries.length > 0 ? deptEntries : defaultDepts.map((d) => [d, 0]);

  const recent = [...assets].reverse().slice(0, 5);

  const maintenanceAlerts = assets
    .filter((a) => a.maintenanceRequired === 'Yes' && a.nextService)
    .slice(0, 3);
  const repairAlerts = assets.filter((a) => a.status === 'Under Repair');
  const warrantyAlerts = assets.filter((a) => a.warrantyAvailable === 'Yes').slice(0, 2);
  const hasAlerts =
    maintenanceAlerts.length > 0 || repairAlerts.length > 0 || warrantyAlerts.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="rounded-xl bg-blue-500/10 p-2.5">
                <Box className="h-5 w-5 text-blue-500" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Asset Management</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Track, manage and monitor all company assets
            </p>
          </div>
          <Link
            to="/asset/assets"
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-500/8 border border-blue-500/20 px-4 py-2 rounded-xl hover:bg-blue-500/15 transition-colors"
          >
            View All Assets <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>

      {total === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-foreground"
        >
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-500/15 p-1.5 text-blue-600">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground">
                No assets currently assigned to{' '}
                {selectedProject && selectedProject.id !== 'all'
                  ? selectedProject.name
                  : 'this project'}
              </span>
              <span className="text-muted-foreground ml-1.5 hidden sm:inline">
                Displaying baseline metrics.
              </span>
            </div>
          </div>
          <Link
            to="/asset/assets"
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0 text-xs"
          >
            Asset Directory <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      )}

      <motion.div
        variants={wrap}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6"
      >
        <StatCard
          label="Total Assets"
          value={total}
          sub={`${owned} owned · ${rented} rented · ${formatCurrency(totalCost)} cost`}
          icon={Package}
          tone="blue"
        />
        <StatCard
          label="Active Assets"
          value={active}
          sub={`${total > 0 ? Math.round((active / total) * 100) : 0}% utilization`}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Maintenance Due"
          value={maintenanceDue}
          sub={`${underRepair} currently under repair`}
          icon={Wrench}
          tone="amber"
        />
        <StatCard
          label="Total Value"
          value={formatCurrency(totalValue)}
          sub="Owned assets, depreciated book value"
          icon={IndianRupee}
          tone="violet"
        />
        <StatCard
          label="Rented"
          value={rented}
          sub={`${owned} owned`}
          icon={Box}
          tone="amber"
        />
      </motion.div>

      <div className="mb-4">
        <FleetSnapshotCard firmId={queryFirmId} />
      </div>

      <div className="mb-4">
        <FleetAlertsCard />
      </div>

      <motion.div
        variants={wrap}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4"
      >
        <motion.div variants={fadeUp} className="lg:col-span-4">
          <Card className="h-full shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Asset Status</CardTitle>
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
              </div>
              <CardDescription className="text-xs">Current status distribution</CardDescription>
            </CardHeader>
            <CardContent className="-mt-2 space-y-3">
              {[
                {
                  label: 'Active',
                  count: active,
                  color: 'bg-emerald-500',
                  textColor: 'text-emerald-600',
                },
                {
                  label: 'Inactive',
                  count: inactive,
                  color: 'bg-slate-400',
                  textColor: 'text-slate-500',
                },
                {
                  label: 'Under Repair',
                  count: underRepair,
                  color: 'bg-amber-500',
                  textColor: 'text-amber-600',
                },
                {
                  label: 'Maintenance Due',
                  count: maintenanceDue,
                  color: 'bg-orange-500',
                  textColor: 'text-orange-600',
                },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className={cn('font-bold tabular-nums', item.textColor)}>
                      {item.count}{' '}
                      <span className="text-muted-foreground/60 font-normal">/ {total}</span>
                    </span>
                  </div>
                  <Progress
                    value={total > 0 ? (item.count / total) * 100 : 0}
                    className="h-2"
                    progressColor={item.color}
                  />
                </div>
              ))}

              <Separator className="my-1" />

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3">
                <div className="text-center">
                  <p className="text-lg font-black tabular-nums text-emerald-600">
                    {total > 0 ? Math.round((active / total) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Active Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black tabular-nums text-amber-600">
                    {warrantyExpiring}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Under Warranty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-4">
          <Card className="h-full shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">By Category</CardTitle>
                <div className="rounded-lg bg-violet-500/10 p-1.5">
                  <Box className="h-4 w-4 text-violet-500" />
                </div>
              </div>
              <CardDescription className="text-xs">Assets per category</CardDescription>
            </CardHeader>
            <CardContent className="-mt-2 space-y-2">
              {displayCategoryEntries.map(([cat, count]) => {
                const cfg = CATEGORY_COLORS[cat as AssetCategory];
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        cfg?.dot ?? 'bg-muted-foreground'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{cat}</span>
                        <span
                          className={cn(
                            'text-xs font-bold tabular-nums',
                            cfg?.text ?? 'text-muted-foreground'
                          )}
                        >
                          {count}
                        </span>
                      </div>
                      <Progress
                        value={total > 0 ? (count / total) * 100 : 0}
                        className="h-1.5"
                        progressColor={cfg?.dot ?? 'bg-muted-foreground'}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-4">
          <Card className="h-full shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">By Department</CardTitle>
                <div className="rounded-lg bg-teal-500/10 p-1.5">
                  <MapPin className="h-4 w-4 text-teal-500" />
                </div>
              </div>
              <CardDescription className="text-xs">
                Asset distribution across departments
              </CardDescription>
            </CardHeader>
            <CardContent className="-mt-2 space-y-2">
              {displayDeptEntries.map(([dept, count]) => (
                <div
                  key={dept}
                  className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{dept}</span>
                      <span className="text-xs font-bold tabular-nums text-teal-600">{count}</span>
                    </div>
                    <Progress
                      value={total > 0 ? (count / total) * 100 : 0}
                      className="h-1.5 mt-1"
                      progressColor="bg-teal-500"
                    />
                  </div>
                </div>
              ))}

              {topDept ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-2.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>
                    <span className="font-bold text-foreground">{topDept}</span> has most assets
                  </span>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-2.5">
                  <Zap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>No department asset allocation yet</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        variants={wrap}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        <motion.div variants={fadeUp} className="lg:col-span-8">
          <Card className="shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Recent Assets</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Latest entries in the system
                  </CardDescription>
                </div>
                <Link
                  to="/asset/assets"
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="-mt-2 p-0">
              {recent.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {recent.map((asset) => {
                    const catCfg = CATEGORY_COLORS[asset.category];
                    const statusCfg = STATUS_COLORS[asset.status];
                    return (
                      <Link
                        key={asset.id}
                        to={`/asset/asset/${asset.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                      >
                        <div className={cn('rounded-xl p-2.5 shrink-0', catCfg?.bg ?? 'bg-muted')}>
                          <Package
                            className={cn('h-4 w-4', catCfg?.text ?? 'text-muted-foreground')}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {asset.productName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <OwnershipBadge value={asset.ownershipType} />
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {asset.sn}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">{asset.brand}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              {asset.department}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-sm font-bold tabular-nums text-foreground">
                            {formatCurrency(asset.assetValue)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Book Value</p>
                        </div>

                        <span
                          className={cn(
                            'shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border',
                            statusCfg.bg,
                            statusCfg.text,
                            statusCfg.border
                          )}
                        >
                          {asset.status}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="h-10 w-10 rounded-2xl bg-muted/60 flex items-center justify-center mb-2">
                    <Package className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">No recent assets</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                    Assets created or assigned to this project will appear here.
                  </p>
                  <Link
                    to="/asset/assets"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View asset directory <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-4">
          <Card className="shadow-xs hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Alerts & Reminders</CardTitle>
                <div className="rounded-lg bg-rose-500/10 p-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="-mt-2 space-y-2">
              {hasAlerts ? (
                <>
                  {maintenanceAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-800/50"
                    >
                      <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 truncate">
                          {a.productName}
                        </p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" /> Service due {a.nextService}
                        </p>
                      </div>
                      <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 shrink-0 px-1.5">
                        {a.priority}
                      </Badge>
                    </div>
                  ))}

                  {repairAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-800/50"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 truncate">
                          {a.productName}
                        </p>
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                          Currently under repair
                        </p>
                      </div>
                    </div>
                  ))}

                  {warrantyAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-800/50"
                    >
                      <Shield className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 truncate">
                          {a.productName}
                        </p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> Warranty till {a.warrantyEnd}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">All Systems Clear</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                    No overdue maintenance, active repairs, or warranty warnings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
