'use client';

import { IconCheck, IconClock, IconPlus, IconX } from '@tabler/icons-react';
import type React from 'react';

const MainGatePassRequest = () => {
  const requests = [
    {
      id: 1,
      type: 'Personal',
      date: '2024-12-11',
      outTime: '02:00 PM',
      inTime: '04:00 PM',
      reason: 'Medical appointment',
      status: 'pending',
    },
    {
      id: 2,
      type: 'Official',
      date: '2024-12-05',
      outTime: '11:00 AM',
      inTime: '01:30 PM',
      reason: 'Bank visit',
      status: 'approved',
    },
    {
      id: 3,
      type: 'Personal',
      date: '2024-11-28',
      outTime: '04:00 PM',
      inTime: '05:00 PM',
      reason: 'Early exit',
      status: 'rejected',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      rejected: 'bg-rose-100 text-rose-700',
    };
    const icons: Record<string, React.ElementType> = {
      approved: IconCheck,
      pending: IconClock,
      rejected: IconX,
    };
    const Icon = icons[status] || IconClock;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${styles[status] || 'bg-gray-100'}`}
      >
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-800 sm:text-2xl">Gate Pass Request</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Request permission for entry/exit</p>
        </div>
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto">
          <IconPlus className="h-4 w-4" />
          New Request
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-800 sm:text-base">Request History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-500 uppercase">
                  Reason
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium whitespace-nowrap text-gray-500 uppercase">
                  Out Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium whitespace-nowrap text-gray-500 uppercase">
                  In Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium whitespace-nowrap text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                    {new Date(request.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                    {request.type}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                    {request.reason}
                  </td>
                  <td className="px-6 py-4 text-center text-sm whitespace-nowrap text-gray-600">
                    {request.outTime}
                  </td>
                  <td className="px-6 py-4 text-center text-sm whitespace-nowrap text-gray-600">
                    {request.inTime}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MainGatePassRequest;
