import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, ChevronRight } from 'lucide-react';

export const AssetSystemLayout: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      <div className="bg-card border rounded-md p-3 px-4 flex items-center justify-between shadow-xs border-blue-200/80 bg-blue-500/5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-blue-500/10 grid place-items-center text-blue-600">
            <Box className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100">
                Asset Management System
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-300 text-blue-800 dark:text-blue-200 bg-blue-100/60 dark:bg-blue-950/60">
                Active Module
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-medium">
              <span>Platform</span>
              <ChevronRight className="size-3 opacity-60" />
              <span className="text-foreground font-semibold">Asset Management</span>
            </div>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default AssetSystemLayout;
