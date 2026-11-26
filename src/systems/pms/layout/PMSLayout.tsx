// @ts-nocheck
import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, FolderTree, ArrowLeft } from 'lucide-react';
import { PMSProvider, usePMS } from '../context/PMSContext';
import { migrateLocalStorageToPMS } from '../utils/localStorageMigrator';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { hasPageAccess } from '@/lib/permissions';

// Page permission needed for each PMS URL (the same keys the sidebar and Manage Users use)
const PAGE_RULES: [RegExp, string][] = [
  [/^\/pms\/(indents\/create$)/, 'pmsCreateIndent'],
  [/^\/pms\/(indents\/approve)/, 'pmsIndentApproval'],
  [/^\/pms\/(indents\/vendor-rates)/, 'pmsVendorRate'],
  [/^\/pms\/(indents\/approval|indents\/technical-approval|indents\/management-approval)/, 'pmsRateApproval'],
  [/^\/pms\/(indents\/(purchase-orders|pending-po|create-po|po-history))/, 'pmsPo'],
  [/^\/pms\/(final-approval)/, 'pmsFinalApproval'],
  [/^\/pms\/(drawings)/, 'pmsDrawings'],
  [/^\/pms\/(execution|view-design|minors|project-minors|execution-details|actual-details|auto-comparison|excavation-murum|murum|valve-report|back-filling-report)/, 'pmsExecution'],
  [/^\/pms\/(billing\/department)/, 'pmsBilling'],
  [/^\/pms\/(billing\/subcontractor)/, 'pmsSubBilling'],
  [/^\/pms\/(documentation)/, 'pmsDocuments'],
  [/^\/pms\/(share-logs)/, 'pmsShareLogs'],
];

const PMSHeader: React.FC = () => {
  const { selectedProject, clearProject } = usePMS();
  const location = useLocation();
  const navigate = useNavigate();

  const isProjectsIndex = location.pathname === '/pms/projects';

  return (
    <div className="bg-card border rounded-md p-3 px-4 flex items-center justify-between shadow-xs border-emerald-500/20 bg-emerald-500/5 mb-4">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-md bg-emerald-500/10 grid place-items-center text-emerald-600 dark:text-emerald-400">
          <Building2 className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold leading-none">Project Management System (PMS)</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
              Execution &amp; DPR Platform
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-medium">
            <span>PMS</span>
            <ChevronRight className="size-3 opacity-60" />
            <span
              className="cursor-pointer hover:underline text-foreground"
              onClick={() => navigate('/pms/projects')}
            >
              Projects
            </span>
            {selectedProject && (
              <>
                <ChevronRight className="size-3 opacity-60" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[200px]">
                  {selectedProject.project_name} ({selectedProject.serial_no})
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {selectedProject && !isProjectsIndex && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1 border-emerald-500/30"
            onClick={() => {
              navigate('/pms/projects');
            }}
          >
            <FolderTree className="size-3.5 text-emerald-600" />
            Switch Project
          </Button>
        )}
      </div>
    </div>
  );
};

export const PMSLayout: React.FC = () => {
  useEffect(() => {
    migrateLocalStorageToPMS();
  }, []);

  const { user } = useAuth();
  const { pathname } = useLocation();
  const gateKey = PAGE_RULES.find(([re]) => re.test(pathname))?.[1];
  if (gateKey && !hasPageAccess(user, undefined, 'VIEW', gateKey as any)) {
    return <Navigate to="/pms/projects" replace />;
  }

  return (
    <PMSProvider>
      <div className="space-y-4 w-full">
        <PMSHeader />
        <Outlet />
      </div>
    </PMSProvider>
  );
};

export default PMSLayout;
