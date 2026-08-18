import React from 'react';
import { Outlet } from 'react-router-dom';
import { Wallet, ChevronRight } from 'lucide-react';

export const PettyCashSystemLayout: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      {/* Petty Cash Sub-Header */}
      <div className="bg-card border rounded-md p-3 px-4 flex items-center justify-between shadow-xs border-amber-200 bg-amber-500/5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-amber-500/10 grid place-items-center text-amber-600">
            <Wallet className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-none">Petty Cash & Expense System</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-300 text-amber-800 bg-amber-100">
                Finance & Float Module
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-medium">
              <span>Platform</span>
              <ChevronRight className="size-3 opacity-60" />
              <span className="text-foreground font-semibold">Petty Cash</span>
            </div>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default PettyCashSystemLayout;
