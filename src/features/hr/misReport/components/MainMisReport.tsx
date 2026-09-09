'use client';

import { IconChartBar, IconChartLine, IconChartPie, IconDownload } from '@tabler/icons-react';

const MainMisReport = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">MIS Reports</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Management Information System Reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            title: 'Monthly Attrition',
            desc: 'Employee turnover analysis by department',
            icon: IconChartLine,
            color: 'text-red-500',
          },
          {
            title: 'Recruitment Efficiency',
            desc: 'Time to fill vs cost per hire',
            icon: IconChartBar,
            color: 'text-blue-500',
          },
          {
            title: 'Diversity Metrics',
            desc: 'Gender and demographic distribution',
            icon: IconChartPie,
            color: 'text-purple-500',
          },
          {
            title: 'Training Effectiveness',
            desc: 'ROI on training programs',
            icon: IconChartLine,
            color: 'text-emerald-500',
          },
          {
            title: 'Compensation Analysis',
            desc: 'Salary band distribution',
            icon: IconChartBar,
            color: 'text-amber-500',
          },
          {
            title: 'Leave Liability',
            desc: 'Accrued leave balance valuation',
            icon: IconChartPie,
            color: 'text-indigo-500',
          },
        ].map((report, idx) => (
          <div
            key={idx}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className={`rounded-lg bg-gray-50 p-3`}>
                <report.icon className={`h-8 w-8 ${report.color}`} />
              </div>
              <button type="button" className="text-gray-400 hover:text-gray-600">
                <IconDownload className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">{report.title}</h3>
            <p className="text-sm text-gray-500">{report.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainMisReport;
