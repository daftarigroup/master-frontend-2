'use client';
import {
 Activity,
 AlertCircle,
 Building2,
 Calendar,
 CheckCircle,
 Clock,
 Filter,
 Loader2,
 TrendingUp,
 User,
 Users,
 Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useDailyReport } from '../server/tanstackQuery/useDailyreportQueries';
import type { DailyReportTask } from '../server/api/dailyreportApi';

const formatTaskTime = (val?: string | null) => {
  if (!val) return 'Today';
  const d = new Date(val);
  return isNaN(d.getTime())
    ? 'Today'
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface AuthUser {
 role: 'admin' | 'user';
 username: string;
}

const DailyReport = () => {
 // Mock user - TODO: Replace with actual auth store
 const user: AuthUser = { role: 'admin', username: 'Admin User' };
 const [selectedUser, setSelectedUser] = useState<string>('all');

 const { data, isLoading, isError } = useDailyReport();

 const today = new Date().toLocaleDateString('en-US', {
 weekday: 'long',
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 });

 if (isLoading) {
 return (
 <div className="flex h-screen items-center justify-center">
 <div className="flex flex-col items-center gap-2">
 <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
 <p className="text-sm font-medium text-muted-foreground">Loading daily activity...</p>
 </div>
 </div>
 );
 }

 if (isError) {
 return (
 <div className="flex h-96 items-center justify-center p-6 text-center">
 <div className="space-y-4">
 <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
 <h2 className="text-xl font-bold">Failed to load report</h2>
 <p className="text-muted-foreground">Please try again later or contact support.</p>
 </div>
 </div>
 );
 }

 const allTasks = data?.tasks || [];

 // Extract unique technicians from the real tasks for the filter
 const uniqueTechnicians = Array.from(
 new Set(allTasks.map((t) => t.assignedTo).filter((name) => name !== 'Unassigned'))
 );
 const users = [
 { id: 'all', name: 'All Users' },
 ...uniqueTechnicians.map((name) => ({ id: name, name })),
 ];

 // Filter by selected user
 const filteredTasks = allTasks.filter((task: any) => {
 if (user?.role === 'admin' && selectedUser === 'all') {
 return true;
 }
 if (user?.role === 'admin' && selectedUser !== 'all') {
 return task.assignedTo === selectedUser;
 }
 return task.assignedTo === user?.username;
 });

 // Calculate live statistics based on filtered tasks
 const completedTasksCount = filteredTasks.filter((t: any) => t.status === 'completed').length;
 const inProgressTasksCount = filteredTasks.filter((t: any) => t.status === 'in-progress').length;
 const pendingTasksCount = filteredTasks.filter((t: any) => t.status === 'pending').length;
 const totalTasksCount = filteredTasks.length;

 // Use machine stats from backend (or calculate from tasks)
 const backendMachineStats = data?.machineStats || {
 operational: 0,
 maintenance: 0,
 down: 0,
 totalMachines: 0,
 };

 const stats = [
 {
 title: 'Total Tasks Today',
 value: totalTasksCount,
 icon: Activity,
 textColor: 'text-blue-600',
 bgColor: 'bg-blue-50',
 },
 {
 title: 'Completed',
 value: completedTasksCount,
 icon: CheckCircle,
 textColor: 'text-green-600',
 bgColor: 'bg-green-50',
 },
 {
 title: 'In Progress',
 value: inProgressTasksCount,
 icon: Clock,
 textColor: 'text-yellow-600',
 bgColor: 'bg-yellow-50',
 },
 {
 title: 'Pending',
 value: pendingTasksCount,
 icon: AlertCircle,
 textColor: 'text-orange-600',
 bgColor: 'bg-orange-50',
 },
 ];

 const machineStats = [
 {
 title: 'Operational',
 value: backendMachineStats.operational || '-', // Need registry for this
 color: 'text-green-600',
 bgColor: 'bg-green-100',
 },
 {
 title: 'Maintenance',
 value: backendMachineStats.maintenance,
 color: 'text-yellow-600',
 bgColor: 'bg-yellow-100',
 },
 {
 title: 'Down',
 value: backendMachineStats.down,
 color: 'text-red-600',
 bgColor: 'bg-red-100',
 },
 ];

 return (
 <div className="space-y-6 p-6">
 {/* Header */}
 <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">Daily Activity Report</h1>
 <div className="mt-2 flex items-center gap-2 text-gray-600">
 <Calendar className="h-5 w-5 text-indigo-600" />
 <p className="text-lg font-medium">{today}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 border border-indigo-100">
 <Users className="h-5 w-5 text-indigo-600" />
 <span className="text-sm font-bold text-indigo-900">
 {user?.role === 'admin' ? 'Master View' : 'Personal View'}
 </span>
 </div>
 </div>
 </div>

 {/* User Filter - Only show for admin */}
 {user?.role === 'admin' && (
 <div className="mt-4 border-t border-gray-200 pt-4">
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex items-center gap-2 text-gray-700">
 <Filter className="h-5 w-5 text-indigo-600" />
 <span className="text-sm font-bold">Filter by Tech:</span>
 </div>
 <select
 value={selectedUser}
 onChange={(e) => setSelectedUser(e.target.value)}
 className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
 >
 {users.map((u) => (
 <option key={u.id} value={u.id}>
 {u.name}
 </option>
 ))}
 </select>
 {selectedUser !== 'all' && (
 <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
 Active Filter: {selectedUser}
 </span>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Task Statistics */}
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {stats.map((stat, index) => (
 <div
 key={index}
 className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 {stat.title}
 </p>
 <p className={`mt-2 text-3xl font-bold ${stat.textColor} tabular-nums`}>
 {stat.value}
 </p>
 </div>
 <div className={`${stat.bgColor} rounded-xl p-3 border border-border/50`}>
 <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Machine Status Overview */}
 <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
 <div className="mb-6 flex items-center gap-3">
 <div className="bg-indigo-100 p-2 rounded-lg">
 <Wrench className="h-5 w-5 text-indigo-600" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-slate-900 leading-none">Asset Status Summary</h2>
 <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-tighter">
 Real-time health of machines currently in repair
 </p>
 </div>
 </div>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
 {machineStats.map((stat, index) => (
 <div
 key={index}
 className={`${stat.bgColor} rounded-xl border border-border/10 p-5 transition-all shadow-inner`}
 >
 <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 opacity-60 font-bold">
 {stat.title}
 </p>
 <p className={`mt-1 text-3xl font-bold ${stat.color} tabular-nums`}>{stat.value}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Today's Tasks List */}
 <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
 <div className="border-b border-border bg-muted/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div className="flex items-center gap-2 min-w-0">
 <Activity className="h-5 w-5 text-indigo-600 shrink-0" />
 <h2 className="text-xl font-bold text-slate-900 truncate">Live Activity Log</h2>
 </div>
 <Badge variant="outline" className="font-bold text-[10px] uppercase bg-white shrink-0">
 {filteredTasks.length} Log Entries
 </Badge>
 </div>
 <div className="p-6">
 {filteredTasks.length === 0 ? (
 <div className="py-16 text-center">
 <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4 border border-border">
 <Activity className="h-8 w-8 text-slate-300" />
 </div>
 <p className="text-lg font-bold text-slate-900">No activity recorded today</p>
 <p className="text-sm text-muted-foreground font-medium">
 New repair indents or work updates will appear here automatically.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task: DailyReportTask) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-5 transition-all hover:bg-slate-50/50 hover:border-indigo-200 group bg-card shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {task.indentNumber && (
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                            {task.indentNumber}
                          </span>
                        )}
                        {task.priority && (
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              task.priority === 'URGENT' || task.priority === 'HIGH'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : task.priority === 'MEDIUM'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors text-base">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-xs font-medium text-slate-600 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase whitespace-nowrap shadow-xs border shrink-0 ${
                        task.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : task.status === 'in-progress'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-slate-50 text-slate-700 border-slate-100'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="pt-3 mt-auto border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      {/* Only present in "All Companies" mode. */}
                      {task.tenant && (
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded text-xs font-semibold text-indigo-700 uppercase shrink-0">
                          <Building2 className="h-3.5 w-3.5" />
                          {task.tenant.name}
                        </div>
                      )}
                      <div
                        className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 shrink-0 max-w-[220px]"
                        title={task.machineName || task.machineId || 'Machine'}
                      >
                        <Wrench className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{task.machineName || task.machineId || 'Machine'}</span>
                        {task.machineId && task.machineName && task.machineId !== task.machineName && (
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">({task.machineId})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 min-w-0">
                        <User className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{task.assignedTo || 'Admin'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 shrink-0">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{formatTaskTime(task.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
 </div>
 )}
 </div>
 </div>

 {/* Performance Summary */}
 <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30 p-8 shadow-sm">
 <div className="mb-6 flex items-center gap-3">
 <div className="bg-emerald-100 p-2 rounded-lg">
 <TrendingUp className="h-5 w-5 text-emerald-600" />
 </div>
 <h2 className="text-xl font-bold text-slate-900">Performance Metrics</h2>
 </div>
 <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
 <div className="space-y-4">
 <div className="flex justify-between items-end">
 <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
 Resolvability Rate
 </p>
 <span className="text-lg font-semibold text-indigo-600">
 {totalTasksCount > 0
 ? Math.round((completedTasksCount / totalTasksCount) * 100)
 : 0}
 %
 </span>
 </div>
 <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner border border-slate-300/20">
 <div
 className="h-full rounded-full bg-indigo-600 transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.4)]"
 style={{
 width: `${totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0}%`,
 }}
 ></div>
 </div>
 <p className="text-[10px] font-bold text-slate-400 italic">
 Percentage of tasks finalized today vs total daily load
 </p>
 </div>

 <div className="space-y-4">
 <div className="flex justify-between items-end">
 <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
 Service Coverage
 </p>
 <span className="text-lg font-semibold text-emerald-600">
 {backendMachineStats.totalMachines > 0
 ? Math.round(
 ((backendMachineStats.totalMachines - backendMachineStats.down) /
 backendMachineStats.totalMachines) *
 100
 )
 : 100}
 %
 </span>
 </div>
 <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner border border-slate-300/20">
 <div
 className="h-full rounded-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
 style={{
 width: `${backendMachineStats.totalMachines > 0 ? ((backendMachineStats.totalMachines - backendMachineStats.down) / backendMachineStats.totalMachines) * 100 : 100}%`,
 }}
 ></div>
 </div>
 <p className="text-[10px] font-bold text-slate-400 italic">
 Ratio of operational machines vs total active repair queue
 </p>
 </div>
 </div>
 </div>
 </div>
 );
};

// Simple Badge and helper (if not imported)
const Badge = ({ children, className }: any) => (
 <span
 className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
 >
 {children}
 </span>
);

export default DailyReport;
