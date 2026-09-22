'use client';
import {
 AlertCircle,
 CalendarDays,
 CheckCircle,
 ChevronLeft,
 ChevronRight,
 Clock,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCalendarEvents } from '../server/tanstackQuery/useCalendarQueries';

interface Task {
 id: string;
 title: string;
 date: Date;
 status: 'completed' | 'pending' | 'in-progress' | 'approved';
 type: 'indent' | 'repair' | 'maintenance';
 priority: 'low' | 'medium' | 'high';
 time: string;
}

const Calendar = () => {
 const [currentDate, setCurrentDate] = useState(new Date());
 const [view, setView] = useState<'day' | 'week' | 'month'>('month');
 const [selectedDate, setSelectedDate] = useState<Date | null>(null);
 const [tasks, setTasks] = useState<Task[]>([]);

 const { data: rawEvents = [] } = useCalendarEvents();

 useEffect(() => {
 if (rawEvents && rawEvents.length > 0) {
 const mapped: Task[] = rawEvents.map((e, idx) => {
 const rawStatus = (e.status || '').toUpperCase();
 let status: Task['status'] = 'pending';
 if (rawStatus === 'COMPLETED' || rawStatus === 'CLOSED' || rawStatus === 'RESOLVED') {
 status = 'completed';
 } else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'SENT_FOR_REPAIR') {
 status = 'in-progress';
 } else if (rawStatus === 'APPROVED') {
 status = 'approved';
 }

 const rawPriority = (e.priority || '').toLowerCase();
 const priority: Task['priority'] =
 rawPriority === 'high' || rawPriority === 'critical' ? 'high' : rawPriority === 'low' ? 'low' : 'medium';

 const d = e.date ? new Date(e.date) : new Date();

 return {
 id: String(e.id ?? idx + 1),
 title: e.title || 'Repair Task',
 date: isNaN(d.getTime()) ? new Date() : d,
 status,
 type: (e.type as Task['type']) || 'repair',
 priority,
 time: '10:00 AM',
 };
 });
 setTasks(mapped);
 } else {
 setTasks([]);
 }
 }, [rawEvents]);

 const getDaysInMonth = (date: Date) => {
 const year = date.getFullYear();
 const month = date.getMonth();
 const firstDay = new Date(year, month, 1);
 const lastDay = new Date(year, month + 1, 0);
 const daysInMonth = lastDay.getDate();
 const startingDayOfWeek = firstDay.getDay();

 return { daysInMonth, startingDayOfWeek, year, month };
 };

 const getTasksForDate = (date: Date) => {
 return tasks.filter(
 (task) =>
 task.date.getDate() === date.getDate() &&
 task.date.getMonth() === date.getMonth() &&
 task.date.getFullYear() === date.getFullYear()
 );
 };

 const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

 const previousMonth = () => {
 setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
 setSelectedDate(null);
 };

 const nextMonth = () => {
 setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
 setSelectedDate(null);
 };

 const previousDay = () => {
 const newDate = new Date(currentDate);
 newDate.setDate(currentDate.getDate() - 1);
 setCurrentDate(newDate);
 };

 const nextDay = () => {
 const newDate = new Date(currentDate);
 newDate.setDate(currentDate.getDate() + 1);
 setCurrentDate(newDate);
 };

 const getTypeColor = (type: string) => {
 switch (type) {
 case 'indent':
 return 'bg-purple-50 text-purple-700 border-purple-100';
 case 'repair':
 return 'bg-blue-50 text-blue-700 border-blue-100';
 case 'maintenance':
 return 'bg-orange-50 text-orange-700 border-orange-100';
 default:
 return 'bg-gray-50 text-gray-700 border-gray-100';
 }
 };

 const getStatusIcon = (status: string) => {
 switch (status) {
 case 'completed':
 return <CheckCircle size={14} className="text-green-600" />;
 case 'pending':
 return <Clock size={14} className="text-amber-500" />;
 case 'in-progress':
 return <Clock size={14} className="text-blue-500" />;
 case 'approved':
 return <CheckCircle size={14} className="text-green-500" />;
 default:
 return <AlertCircle size={14} className="text-gray-400" />;
 }
 };

 const renderMonthView = () => {
 const days = [];
 const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

 for (let i = 0; i < totalCells; i++) {
 const dayNumber = i - startingDayOfWeek + 1;
 const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
 const date = isValidDay ? new Date(year, month, dayNumber) : null;
 const dayTasks = date ? getTasksForDate(date) : [];
 const isToday = date && date.toDateString() === new Date().toDateString();
 const isSelected =
 selectedDate && date && date.toDateString() === selectedDate.toDateString();

 days.push(
 <div
 key={i}
 className={`min-h-[100px] md:min-h-[110px] min-w-0 p-1.5 border-b border-r border-gray-100 transition-colors duration-200 relative
 ${!isValidDay ? 'bg-gray-50/30' : 'bg-white hover:bg-gray-50 cursor-pointer'}
 ${isSelected ? 'bg-indigo-50/50 ring-inset ring-2 ring-indigo-100' : ''}
 `}
 onClick={() => date && setSelectedDate(date)}
 >
 {isValidDay && (
 <>
 <div className="flex items-center justify-between mb-1.5">
 <span
 className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold
 ${isToday ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600'}
 `}
 >
 {dayNumber}
 </span>
 {dayTasks.length > 0 && (
 <span
 className={`text-[10px] font-bold px-1.5 rounded-full ${dayTasks.length > 2 ? 'bg-indigo-100 text-indigo-700' : 'text-transparent'}`}
 >
 {dayTasks.length > 2 ? `+${dayTasks.length - 2}` : '.'}
 </span>
 )}
 </div>
 <div className="space-y-1">
 {dayTasks.slice(0, 2).map((task) => (
 <div
 key={task.id}
 className={`text-[9px] px-1.5 py-0.5 rounded-sm border truncate flex items-center gap-1.5 font-medium
 ${getTypeColor(task.type)}
 `}
 >
 <div
 className={`w-1 h-1 rounded-full ${task.type === 'indent' ? 'bg-purple-500' : task.type === 'repair' ? 'bg-blue-500' : 'bg-orange-500'}`}
 />
 {task.title}
 </div>
 ))}
 </div>
 </>
 )}
 </div>
 );
 }

 return days;
 };

 const renderWeekView = () => {
 const weekStart = new Date(currentDate);
 weekStart.setDate(currentDate.getDate() - currentDate.getDay());

 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
 {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
 const date = new Date(weekStart);
 date.setDate(weekStart.getDate() + dayOffset);
 const dayTasks = getTasksForDate(date);
 const isToday = date.toDateString() === new Date().toDateString();

 return (
 <div
 key={dayOffset}
 className={`bg-white rounded-lg border p-3 flex flex-col h-full min-h-[140px] shadow-xs
 ${isToday ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'}
 `}
 >
 <div className="text-center mb-3 pb-2 border-b border-gray-50">
 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOffset]}
 </div>
 <div
 className={`text-xl font-bold ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}
 >
 {date.getDate()}
 </div>
 </div>

 <div className="space-y-1.5 grow overflow-y-auto max-h-[200px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
 {dayTasks.length === 0 ? (
 <div className="h-full flex items-center justify-center text-gray-300 text-xs italic py-4">
 No events
 </div>
 ) : (
 dayTasks.map((task) => (
 <div
 key={task.id}
 className={`p-1.5 rounded-sm border text-[10px] font-medium leading-tight
 ${getTypeColor(task.type)}
 `}
 >
 {task.title}
 </div>
 ))
 )}
 </div>
 </div>
 );
 })}
 </div>
 );
 };

 const renderDayView = () => {
 const dayTasks = getTasksForDate(currentDate);

 return (
 <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden h-full flex flex-col">
 <div className="p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
 <h3 className="text-lg font-bold text-gray-900">
 {currentDate.toLocaleDateString('en-US', {
 weekday: 'long',
 month: 'long',
 day: 'numeric',
 })}
 </h3>
 </div>

 <div className="p-4 overflow-y-auto flex-1">
 {dayTasks.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 h-full">
 <CalendarDays className="w-12 h-12 mb-3 opacity-20" />
 <p className="text-sm">No scheduled tasks for this day</p>
 </div>
 ) : (
 <div className="space-y-4">
 {dayTasks
 .sort((a, b) => a.time.localeCompare(b.time))
 .map((task) => (
 <div key={task.id} className="flex gap-4 group">
 <div className="w-16 pt-3 text-right">
 <span className="text-xs font-semibold text-gray-500 font-mono">
 {task.time}
 </span>
 </div>
 <div className="relative flex-1 pb-4 border-l border-gray-100 pl-6 last:border-0 last:pb-0">
 <div
 className={`absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs z-10 
 ${task.type === 'indent' ? 'bg-purple-500' : task.type === 'repair' ? 'bg-blue-500' : 'bg-orange-500'}
 `}
 />

 <div
 className={`p-3 rounded-lg border hover:shadow-md transition-all duration-200 bg-white
 ${task.status === 'completed' ? 'border-l-4 border-l-green-500' : 'border-gray-200'}
 `}
 >
 <div className="flex justify-between items-start mb-1">
 <div>
 <h4 className="text-sm font-bold text-gray-800">{task.title}</h4>
 <span
 className={`inline-block mt-1 text-[10px] px-1.5 rounded-sm border uppercase tracking-wider font-semibold ${getTypeColor(task.type)}`}
 >
 {task.type}
 </span>
 </div>
 {getStatusIcon(task.status)}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
 };

 return (
 <div className="h-full max-h-screen flex flex-col bg-white rounded-xl shadow-xs overflow-hidden">
 {/* Header Section */}
 <div className="p-5 border-b border-gray-100 shrink-0 bg-white z-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Calendar</h1>
 <p className="text-sm text-gray-500">Manage repair schedules & indent tracking</p>
 </div>

 <div className="flex bg-gray-100/80 p-1 rounded-lg self-start sm:self-auto">
 {(['day', 'week', 'month'] as const).map((v) => (
 <button
 key={v}
 type="button"
 onClick={() => setView(v)}
 className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all
 ${
 view === v
 ? 'bg-white text-indigo-700 shadow-xs'
 : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
 }
 `}
 >
 {v}
 </button>
 ))}
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
 <div className="flex items-center gap-1 shrink-0">
 <button
 type="button"
 onClick={view === 'day' ? previousDay : previousMonth}
 className="p-1.5 hover:bg-white hover:shadow-xs rounded-md text-gray-600 transition-all border border-transparent hover:border-gray-200"
 >
 <ChevronLeft className="w-5 h-5" />
 </button>
 <button
 type="button"
 onClick={() => setCurrentDate(new Date())}
 className="text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 shadow-xs rounded-md text-gray-700 hover:bg-gray-50 mx-1"
 >
 Today
 </button>
 <button
 type="button"
 onClick={view === 'day' ? nextDay : nextMonth}
 className="p-1.5 hover:bg-white hover:shadow-xs rounded-md text-gray-600 transition-all border border-transparent hover:border-gray-200"
 >
 <ChevronRight className="w-5 h-5" />
 </button>
 </div>

 <h2 className="text-lg font-bold text-gray-900 tabular-nums truncate min-w-0">
 {view === 'day'
 ? currentDate.toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 })
 : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
 </h2>

 <div className="hidden sm:flex gap-3 text-[10px] font-medium text-gray-500">
 <div className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-purple-500"></span> Indent
 </div>
 <div className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-blue-500"></span> Repair
 </div>
 <div className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-orange-500"></span> Maint
 </div>
 </div>
 </div>
 </div>

 {/* Main Content Scrollable Area */}
 <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 custom-scrollbar">
 {view === 'month' && (
 <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden mb-4">
 <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
 <div
 key={day}
 className="py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider"
 >
 {day}
 </div>
 ))}
 </div>
 <div className="grid grid-cols-7 bg-gray-100 gap-px border-b border-gray-200">
 {renderMonthView()}
 </div>
 </div>
 )}

 {view === 'week' && renderWeekView()}
 {view === 'day' && renderDayView()}

 {/* Selected Date Details Panel */}
 {selectedDate && view === 'month' && (
 <div className="animate-in slide-in-from-bottom-4 duration-300 border border-gray-200 rounded-xl p-5 bg-white shadow-xs">
 <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-100 pb-3">
 <h3 className="font-bold text-gray-900 flex items-center gap-2 min-w-0">
 <CalendarDays size={18} className="text-indigo-600 shrink-0" />
 <span className="truncate">Activities for {selectedDate.toLocaleDateString()}</span>
 </h3>
 <button
 type="button"
 onClick={() => setSelectedDate(null)}
 className="text-xs font-medium text-gray-500 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded-sm transition-colors shrink-0"
 >
 Close
 </button>
 </div>

 {getTasksForDate(selectedDate).length === 0 ? (
 <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
 <p className="text-sm">No scheduled activities for this date.</p>
 </div>
 ) : (
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {getTasksForDate(selectedDate).map((task) => (
 <div
 key={task.id}
 className={`p-3 rounded-lg border bg-opacity-40 hover:bg-opacity-60 transition-colors flex gap-3 items-start group ${getTypeColor(task.type)}`}
 >
 <div className="mt-1 bg-white p-1 rounded-md shadow-xs">
 {getStatusIcon(task.status)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="text-sm font-bold text-gray-800 truncate" title={task.title}>
 {task.title}
 </div>
 <div className="text-xs opacity-80 flex items-center gap-2 mt-1 font-medium">
 <Clock size={10} />
 <span>{task.time}</span>
 <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
 <span className="capitalize">{task.status.replace('-', ' ')}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
};

export default Calendar;
