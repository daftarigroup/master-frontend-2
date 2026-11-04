// @ts-nocheck
import { ListChecks, Mountain, Ruler, GitCompare, ClipboardList, Layers, CheckSquare } from 'lucide-react';

// The 6-stage SOP - text is carried over verbatim from the reference flow-charts. `links` are
// quick-jump buttons into the real pages that already implement part of that stage (built per
// project, so each needs the current projectNo); stages with no matching page yet get an empty
// list rather than a link that would point somewhere misleading.
export const STAGES = (projectNo) => [
  {
    number: 1,
    title: 'Mobilization & Consultancy',
    status: 'planned',
    steps: [
      'Receive Work Order; review Agreement, BOQ, specifications and milestones',
      'Open correspondence, drawing, submittal, procurement and approval registers',
      'Select design consultancy and issue PO mentioning Work Name, Agreement No., scope, schedule and fees',
    ],
    links: [],
  },
  {
    number: 2,
    title: 'Survey, Design & Approval',
    status: 'partial',
    steps: [
      'Conduct survey: TBM, levels, chainages, crossings, utilities and command area',
      'Prepare hydraulic design, minor-wise alignment, L-section, dia/class, valves and specials',
      'Prepare minor-wise and dia-wise pipe, valve and specials quantity summaries',
      'Contractor submits design and drawings by covering letter with Work Name and Agreement No.',
      'Approval route: Canal Division → Circle Office → Canal Design Division → Superintending Engineer',
      'Resolve comments, submit compliance and issue Approved-for-Construction drawings',
    ],
    links: [
      { label: 'Design Table', to: `/view-design/${encodeURIComponent(projectNo)}`, icon: ListChecks },
    ],
  },
  {
    number: 3,
    title: 'Concrete Structure Drawings',
    status: 'planned',
    steps: [
      'Hire structural consultancy through project-linked PO',
      'Prepare RCC calculations, valve chambers, thrust/anchor blocks, BBS and drawings',
      'Submit by contractor letter with Work Name, Agreement No. and drawing schedule',
      'Department scrutiny, revision/compliance and competent-authority approval before work',
    ],
    links: [],
  },
  {
    number: 4,
    title: 'Vendor, QAP & TPI',
    status: 'partial',
    steps: [
      'Raise material requirement from approved minor-wise/dia-wise design quantities',
      'Invite rates; prepare technical-commercial comparison and finalize approved vendor',
      'Issue vendor PO with specifications, QAP, TPI, hold points, reports and delivery schedule',
      'Vendor submits QAP/TPI request with project details, batch, factory, date and time slot',
      'Canal Sub-Division forwards request to Executive Engineer for approval',
      'Conduct QAP/TPI; rectify NCR and retest if required',
      'Obtain dispatch clearance; material travels with TPI report and test certificates',
    ],
    links: [
      { label: 'Material Requirement', to: `/material-requirement/${encodeURIComponent(projectNo)}`, icon: ClipboardList },
    ],
  },
  {
    number: 5,
    title: 'Execution & Daily Records',
    status: 'implemented',
    steps: [
      'Receive material; prepare MIR/GRN and verify batch, marking, quantity and damage',
      'Update stock and traceability: opening, inward, issue, balance, minor and chainage',
      'Execute setting out → excavation → bedding → laying/jointing → valves → structures → testing → backfilling',
      'Maintain inspection requests, jointing records, concrete tests and pressure-test records',
      'Maintain DPR: manpower, machinery, location, BOQ quantity, material, hindrance, photos and next-day plan',
    ],
    links: [
      { label: 'Execution Details', to: `/execution-details/${encodeURIComponent(projectNo)}`, icon: ListChecks },
      { label: 'Excavation', to: `/excavation-murum/${encodeURIComponent(projectNo)}`, icon: Mountain },
      { label: 'Murum', to: `/murum/${encodeURIComponent(projectNo)}`, icon: Layers },
      { label: 'Actual Details', to: `/actual-details/${encodeURIComponent(projectNo)}`, icon: Ruler },
      { label: 'Auto Comparison', to: `/auto-comparison/${encodeURIComponent(projectNo)}`, icon: GitCompare },
      { label: 'Back Filling Report', to: `/back-filling-report/${encodeURIComponent(projectNo)}`, icon: CheckSquare },
    ],
  },
  {
    number: 6,
    title: 'Billing & Close-out',
    status: 'planned',
    steps: [
      'Prepare joint measurements, MB, BOQ reconciliation and weekly/monthly progress',
      'Prepare RA Bill with measurements, tests, drawings, photos and material statements',
      'Complete testing, commissioning, valve operation, flushing and defect rectification',
      'Submit as-built drawings, final schedules, TPI dossier, warranties, O&M manual and final bill',
    ],
    links: [],
  },
];

export const STATUS_STYLES = {
  implemented: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  planned: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const STATUS_LABELS = {
  implemented: 'In System',
  partial: 'Partially in System',
  planned: 'Reference Only',
};

export const STEP_STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed'];

export const STEP_STATUS_STYLES = {
  Pending: 'bg-gray-100 text-gray-600 border-gray-200',
  'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
