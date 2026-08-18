import React from 'react';
import { Outlet } from 'react-router-dom';
import { Files, ChevronRight } from 'lucide-react';

export const DocumentSystemLayout: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      {/* Document Sub-Header */}
      <div className="bg-card border rounded-md p-3 px-4 flex items-center justify-between shadow-xs border-indigo-200 bg-indigo-500/5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-indigo-500/10 grid place-items-center text-indigo-600">
            <Files className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-none">Document &amp; Subscription Manager</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-indigo-300 text-indigo-800 bg-indigo-100">
                Compliance &amp; Contracts Module
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-medium">
              <span>Platform</span>
              <ChevronRight className="size-3 opacity-60" />
              <span className="text-foreground font-semibold">Doc &amp; Subscription</span>
            </div>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default DocumentSystemLayout;
