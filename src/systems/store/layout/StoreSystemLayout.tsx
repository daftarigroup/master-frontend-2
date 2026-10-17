import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Store, ChevronRight } from 'lucide-react';

export const StoreSystemLayout: React.FC = () => {
  const location = useLocation();

  // Generate breadcrumb items from location path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const formattedTrail = pathParts.map((part) =>
    part
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );

  return (
    <div className="space-y-4 w-full">
      {/* Store System Sub-Header */}
      <div className="bg-card border rounded-md p-3 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-blue-500/10 grid place-items-center text-blue-600">
            <Store className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-none">Store and Inventory System</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200 text-blue-700 bg-blue-50">
                Active Module
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-medium">
              <span>Platform</span>
              {formattedTrail.map((crumb, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="size-3 opacity-60" />
                  <span className={i === formattedTrail.length - 1 ? 'text-foreground font-semibold' : ''}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Render Active Store View */}
      <Outlet />
    </div>
  );
};

export default StoreSystemLayout;
