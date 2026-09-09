import React from 'react';
import { Outlet } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';

export const HrSystemLayout: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      {/* HR & Facilities Management Sub-Header */}
      <div className="bg-card border rounded-md p-3 px-4 flex items-center justify-between shadow-xs border-teal-200/80 bg-teal-500/5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-teal-500/10 grid place-items-center text-teal-600">
            <Users className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100">
                HR & Facilities Management System
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-teal-300 text-teal-800 dark:text-teal-200 bg-teal-100/60 dark:bg-teal-950/60">
                Active Module
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-medium">
              <span>Platform</span>
              <ChevronRight className="size-3 opacity-60" />
              <span>HR & Facilities</span>
              <ChevronRight className="size-3 opacity-60" />
              <span className="text-foreground font-semibold">Human Resources</span>
            </div>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default HrSystemLayout;
