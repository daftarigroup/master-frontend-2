// @ts-nocheck
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useActiveProject } from '../utils/activeProject';
import PMSLayout from '../layout/PMSLayout';
import LoadingSpinner from '../components/LoadingSpinner';

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-center">
    <div className="text-4xl">🏗️</div>
    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
    <p className="text-sm text-gray-500">This page is being built. Check back soon.</p>
  </div>
);

// Lazy loaded views
const AllProjectsView = React.lazy(() => import('../views/projects/AllProjectsView'));
const NewProjectView = React.lazy(() => import('../views/projects/NewProjectView'));
const DrawingUploadView = React.lazy(() => import('../views/drawings/DrawingUploadView'));
const UploadDrawingView = React.lazy(() => import('../views/drawings/UploadDrawingView'));
const FinalApprovalView = React.lazy(() => import('../views/FinalApprovalView'));

const UploadDesignPageView = React.lazy(() => import('../views/execution/UploadDesignPageView'));
// With an active project open, Execution goes straight to its Minors & Design page; "?list=1" shows the project list.
function ExecutionEntry() {
  const [params] = useSearchParams();
  const active = useActiveProject();
  const serial = active?.serialNo || active?.serial_no;
  if (serial && !params.has('list')) return <Navigate to={`/pms/minors/${encodeURIComponent(serial)}`} replace />;
  return <UploadDesignPageView />;
}
const ViewDesignView = React.lazy(() => import('../views/execution/ViewDesignView'));
const ProjectMinorsView = React.lazy(() => import('../views/execution/ProjectMinorsView'));
const ExecutionDetailsView = React.lazy(() => import('../views/execution/ExecutionDetailsView'));
const ActualDetailsView = React.lazy(() => import('../views/execution/ActualDetailsView'));
const AutoComparisonView = React.lazy(() => import('../views/execution/AutoComparisonView'));
const ExcavationMurumView = React.lazy(() => import('../views/execution/ExcavationMurumView'));
const MurumDetailsView = React.lazy(() => import('../views/execution/MurumDetailsView'));
const ValveReportView = React.lazy(() => import('../views/execution/ValveReportView'));
const BackFillingReportView = React.lazy(() => import('../views/execution/BackFillingReportView'));
const ProductIMFView = React.lazy(() => import('../views/execution/ProductIMFView'));
const ProcessFlowView = React.lazy(() => import('../views/execution/ProcessFlowView'));
const StageDetailView = React.lazy(() => import('../views/execution/StageDetailView'));
const MaterialRequirementView = React.lazy(() => import('../views/execution/MaterialRequirementView'));
const ScheduleReportView = React.lazy(() => import('../views/execution/ScheduleReportView'));

const ProjectAbstractPage = React.lazy(() => import('../views/abstract/ProjectAbstractPage'));
const RAPlanningPage = React.lazy(() => import('../views/abstract/RAPlanning/RAPlanningPage'));
const RAPlanningAbstractPage = React.lazy(() => import('../views/abstract/RAPlanningAbstractPage'));
const FinalComparativePage = React.lazy(() => import('../views/abstract/FinalComparative/FinalComparativePage'));

const DepartmentBillingView = React.lazy(() => import('../views/billing/DepartmentBillingView'));
const SubContractorBillingView = React.lazy(() => import('../views/billing/SubContractorBillingView'));
const BillCalculationPageView = React.lazy(() => import('../views/billing/BillCalculationPageView'));
const RMBillDetailView = React.lazy(() => import('../views/billing/RMBillDetailView'));

const DocumentationView = React.lazy(() => import('../views/documentation/DocumentationView'));
const ShareDocumentView = React.lazy(() => import('../views/documentation/ShareDocumentView'));
const ShareLogsView = React.lazy(() => import('../views/ShareLogsView'));

const PmsCreateIndentView = React.lazy(() => import('../views/indents/PmsCreateIndentView'));
const PmsIndentApprovalView = React.lazy(() => import('../views/indents/PmsIndentApprovalView'));
const PmsVendorRateView = React.lazy(() => import('../views/indents/PmsVendorRateView'));
const PmsTechnicalApprovalView = React.lazy(() => import('../views/indents/PmsTechnicalApprovalView'));
const PmsManagementApprovalView = React.lazy(() => import('../views/indents/PmsManagementApprovalView'));
const PmsPendingPOView = React.lazy(() => import('../views/indents/PmsPendingPOView'));
const PmsCreatePOView = React.lazy(() => import('../views/indents/PmsCreatePOView'));
const PmsPOHistoryView = React.lazy(() => import('../views/indents/PmsPOHistoryView'));
const PmsApprovalView = React.lazy(() => import('../views/indents/PmsApprovalView'));
const PmsPurchaseOrdersView = React.lazy(() => import('../views/indents/PmsPurchaseOrdersView'));

export const PMSRoutes: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <Routes>
        <Route element={<PMSLayout />}>
          {/* Default to projects registry */}
          <Route index element={<Navigate to="projects" replace />} />

          {/* Project Registry */}
          <Route path="projects" element={<AllProjectsView />} />
          <Route path="projects/new" element={<NewProjectView />} />
          <Route path="projects/edit/:projectId" element={<NewProjectView />} />

          {/* Drawings & Designs */}
          <Route path="drawings" element={<DrawingUploadView />} />
          <Route path="drawings/upload" element={<UploadDrawingView />} />
          <Route path="drawing-upload" element={<Navigate to="drawings" replace />} />
          <Route path="upload-drawing" element={<Navigate to="drawings/upload" replace />} />

          {/* Final Approval */}
          <Route path="contracts" element={<Navigate to="/pms/indents/create" replace />} />
          <Route path="final-approval" element={<FinalApprovalView />} />

          {/* Execution & DPR */}
          <Route path="execution" element={<ExecutionEntry />} />
          <Route path="upload-design" element={<Navigate to="execution" replace />} />
          <Route path="view-design/:projectNo" element={<ViewDesignView />} />
          <Route path="minors" element={<ProjectMinorsView />} />
          <Route path="minors/:projectNo" element={<ProjectMinorsView />} />
          <Route path="project-minors/:projectNo" element={<ProjectMinorsView />} />
          <Route path="execution-details/:projectNo" element={<ExecutionDetailsView />} />
          <Route path="actual-details/:projectNo" element={<ActualDetailsView />} />
          <Route path="auto-comparison/:projectNo" element={<AutoComparisonView />} />
          <Route path="excavation-murum/:projectNo" element={<ExcavationMurumView />} />
          <Route path="murum/:projectNo" element={<MurumDetailsView />} />
          <Route path="valve-report/:projectNo" element={<ValveReportView />} />
          <Route path="back-filling-report/:projectNo" element={<BackFillingReportView />} />
          <Route path="product-imf/:projectNo" element={<ProductIMFView />} />
          <Route path="product-imf" element={<ProductIMFView />} />
          <Route path="process-flow/:projectNo" element={<ProcessFlowView />} />
          <Route path="process-flow/:projectNo/:stageNumber" element={<StageDetailView />} />
          <Route path="material-requirement" element={<MaterialRequirementView />} />
          <Route path="material-requirement/:projectNo" element={<MaterialRequirementView />} />
          <Route path="schedule-report/:projectNo" element={<ScheduleReportView />} />

          {/* Calculation Engines: Abstract, RA Planning, Final Comparative */}
          <Route path="abstract/:projectNo" element={<ProjectAbstractPage />} />
          <Route path="project-abstract/:projectNo" element={<ProjectAbstractPage />} />
          <Route path="ra-planning/:projectNo" element={<RAPlanningPage />} />
          <Route path="planned-vs-executed/:projectNo" element={<RAPlanningPage />} />
          <Route path="ra2-planning-abstract/:projectNo" element={<RAPlanningAbstractPage />} />
          <Route path="ra2-planning-abstract" element={<RAPlanningAbstractPage />} />
          <Route path="final-comparative/:projectNo" element={<FinalComparativePage />} />
          <Route path="final-comparative" element={<FinalComparativePage />} />

          {/* Billing & Commercial */}
          <Route path="billing/department" element={<DepartmentBillingView />} />
          <Route path="billing/subcontractor" element={<SubContractorBillingView />} />
          <Route path="billing/department/bill/:billId" element={<BillCalculationPageView mode="DEPARTMENT" />} />
          <Route path="billing/subcontractor/bill/:billId" element={<BillCalculationPageView mode="SUBCONTRACTOR" />} />
          <Route path="billing/rm-bill/:billId" element={<RMBillDetailView />} />
          <Route path="rm1" element={<Navigate to="billing/department" replace />} />
          <Route path="rm2" element={<Navigate to="billing/subcontractor" replace />} />
          <Route path="rm-bill/:billId" element={<RMBillDetailView />} />

          {/* Documentation & Logs */}
          <Route path="documentation" element={<DocumentationView />} />
          <Route path="documentation/share" element={<ShareDocumentView />} />
          <Route path="documentation/share/:docId" element={<ShareDocumentView />} />
          <Route path="share-logs" element={<ShareLogsView />} />
          <Route path="email-logs" element={<Navigate to="share-logs" replace />} />

          {/* PMS Indent-to-PO */}
          <Route path="indents/create" element={<PmsCreateIndentView />} />
          <Route path="indents/approve" element={<PmsIndentApprovalView />} />
          <Route path="indents/vendor-rates" element={<PmsVendorRateView />} />
          <Route path="indents/approval" element={<PmsApprovalView />} />
          <Route path="indents/technical-approval" element={<Navigate to="/pms/indents/approval" replace />} />
          <Route path="indents/management-approval" element={<Navigate to="/pms/indents/approval" replace />} />
          <Route path="indents/purchase-orders" element={<PmsPurchaseOrdersView />} />
          <Route path="indents/pending-po" element={<Navigate to="/pms/indents/purchase-orders" replace />} />
          <Route path="indents/create-po" element={<Navigate to="/pms/indents/purchase-orders" replace />} />
          <Route path="indents/po-history" element={<Navigate to="/pms/indents/purchase-orders" replace />} />

          {/* Settings */}
          <Route path="settings" element={<ComingSoon title="PMS Settings" />} />

          {/* Fallback — absolute path to avoid redirect loops */}
          <Route path="*" element={<Navigate to="/pms/projects" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default PMSRoutes;
