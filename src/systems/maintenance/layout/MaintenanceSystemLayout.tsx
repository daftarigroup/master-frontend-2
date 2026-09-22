import React from 'react';
import { Outlet } from 'react-router-dom';
import { ChevronRight, Wrench } from 'lucide-react';

export const MaintenanceSystemLayout: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      <div className="bg-card border rounded-md p-3 px-4 flex items-center justify-between shadow-xs border-emerald-200/80 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-emerald-500/10 grid place-items-center text-emerald-600">
            <Wrench className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100">
                Maintenance Management System
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-300 text-emerald-800 dark:text-emerald-200 bg-emerald-100/60 dark:bg-emerald-950/60">
                EMMS Active
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-medium">
              <span>Platform</span>
              <ChevronRight className="size-3 opacity-60" />
              <span className="text-foreground font-semibold">Maintenance Management</span>
            </div>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default MaintenanceSystemLayout;
