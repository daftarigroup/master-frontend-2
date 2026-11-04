// @ts-nocheck
import React from 'react';
import { AuditLogEntry } from '@/systems/pms/utils/abstractTypes';
import { History, ShieldCheck, User, Clock, FileText } from 'lucide-react';

interface Props {
  auditLogs: AuditLogEntry[];
}

export default function AuditLogTab({ auditLogs }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <History size={16} className="text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Audit Trail & Revision Log ({auditLogs.length} events)
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 italic">
          Automatic record of every checkbox toggle, rate update, survey point, and adjustment.
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs bg-white">
        <table className="min-w-full text-xs text-left border-collapse font-sans">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 border-r border-slate-200 w-36">Timestamp</th>
              <th className="px-3 py-2 border-r border-slate-200 w-32">User</th>
              <th className="px-3 py-2 border-r border-slate-200 w-36">Action</th>
              <th className="px-3 py-2 border-r border-slate-200">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400">
                  No audit entries recorded yet.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500 border-r border-slate-200 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-850 border-r border-slate-200 flex items-center gap-1.5">
                    <User size={12} className="text-slate-400" />
                    <span>{log.user}</span>
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200 font-mono text-[11px]">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
