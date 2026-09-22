/**
 * Audit HR Mock Data Connections
 *
 * Deeply scans HR system frontend files:
 * - src/features/hr/
 * - src/systems/hr/
 * - src/lib/axios.ts
 * - src/lib/mockHrStore.ts
 *
 * Classifies findings into 4 categories:
 * 1. direct-mock-store: direct import or invocation of mockHrStore
 * 2. mock-adapter-call: API calls to /hrfms/*, /hr/*, /assignments/*, or /employees/*
 * 3. inline-hardcoded-data: embedded seed data, mock/dummy arrays/objects, or // MOCK: comments
 * 4. mock-real-branching: flags/conditionals switching mock vs real logic or interceptor fallbacks
 *
 * Outputs:
 * - reports/hr-mock-inventory.json (machine-readable)
 * - reports/hr-mock-inventory.md (human-readable checklist grouped by sub-module)
 *
 * Usage:
 *   npx tsx scripts/audit-hr-mock-data.ts
 */

import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// ============================================================================
// 1. KNOWN REAL BACKEND ENDPOINTS (master-backend /api/hr routes)
// ============================================================================
const KNOWN_REAL_HR_ENDPOINTS = [
  // Employee Directory
  '/api/hr/employees',
  '/api/hr/employees/stats',
  '/api/hr/employees/leaving',
  '/api/hr/employees/:id',
  '/api/hr/employees/:id/leaving',
  '/api/hr/employee',
  '/api/hr/employee/stats',
  '/api/hr/employee/leaving',
  '/api/hr/employee/:id',
  '/api/hr/employee/:id/leaving',

  // Manpower Deployment Assignments
  '/api/hr/assignments',
  '/api/hr/assignments/active',
  '/api/hr/assignments/events',
  '/api/hr/assignments/employee/:employeeId',
  '/api/hr/assignments/:id',
  '/api/hr/assignments/:id/events',
  '/api/hr/assignments/:id/shift',
  '/api/hr/assignments/:id/leave',
  '/api/hr/assignments/:id/resume',
  '/api/hr/assignments/:id/remove',
  '/api/hr/assignments/:id/complete',

  // Legacy/compatibility aliases
  '/api/hr/project-assignment',
  '/api/hr/project-assignment/active',
  '/api/hr/project-assignment/events',
  '/api/hr/project-assignment/:id',
  '/api/hr/project-assignment/:id/shift',
  '/api/hr/project-assignment/:id/leave',
  '/api/hr/project-assignment/:id/resume',
  '/api/hr/project-assignment/:id/remove',
  '/api/hr/project-assignment/:id/complete',
];

const KNOWN_NON_ID_SUBROUTES = new Set([
  'bulk-import',
  'onboarding',
  'checklist-config',
  'joined-without-account',
  'resign',
  'process-exit',
  'deactivate-user',
  'policy',
  'payroll',
  'payslips',
  'monthly',
  'daily',
  'shifts',
  'claims',
  'today',
  'my-monthly',
  'checkin',
  'checkout',
  'submit',
  'history',
  'stats',
  'leaving',
  'active',
  'events',
  'shift',
  'leave',
  'resume',
  'remove',
  'complete',
]);

// Helper to check if a detected path matches a known real endpoint
function isKnownRealEndpoint(path: string): boolean {
  // Strip query parameters
  const pathWithoutQuery = path.split('?')[0];
  const normalized = pathWithoutQuery.replace(/`/g, '').replace(/\${[^}]+}/g, ':id').trim();
  const stripped = normalized.replace(/^\/api\/hr/, '').replace(/^\/hr/, '');
  const pathSegments = stripped.split('/').filter(Boolean);

  return KNOWN_REAL_HR_ENDPOINTS.some((real) => {
    const realStripped = real.replace(/^\/api\/hr/, '');
    const realSegments = realStripped.split('/').filter(Boolean);

    if (pathSegments.length !== realSegments.length) return false;

    for (let i = 0; i < realSegments.length; i++) {
      const realSeg = realSegments[i];
      const pathSeg = pathSegments[i];

      if (realSeg.startsWith(':')) {
        // If this position is an :id placeholder, ensure pathSeg is not a known non-id action route
        if (KNOWN_NON_ID_SUBROUTES.has(pathSeg.toLowerCase()) && pathSeg !== ':id') {
          return false;
        }
        continue;
      }

      if (realSeg.toLowerCase() !== pathSeg.toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

// Derive expected real backend endpoint from mock or frontend path
function deriveRealEndpoint(rawPath: string): string {
  if (!rawPath) return 'unknown — needs backend';
  // Strip query params for cleaner real route mapping
  const pathWithoutQuery = rawPath.split('?')[0];
  const clean = pathWithoutQuery.replace(/`/g, '').replace(/\${[^}]+}/g, ':id').trim();

  // If path already starts with /api/hr
  if (clean.startsWith('/api/hr/')) return clean;

  // If path starts with /employees or /assignments
  if (clean.startsWith('/employees') || clean.startsWith('/employee')) {
    return `/api/hr${clean.startsWith('/') ? clean : '/' + clean}`;
  }
  if (clean.startsWith('/assignments') || clean.startsWith('/project-assignment')) {
    return `/api/hr${clean.startsWith('/') ? clean : '/' + clean}`;
  }

  // If path starts with /hrfms/
  if (clean.startsWith('/hrfms/')) {
    const suffix = clean.replace(/^\/hrfms\//, '');
    return `/api/hr/${suffix}`;
  }

  // If path starts with /hr/
  if (clean.startsWith('/hr/')) {
    return `/api${clean}`;
  }

  return `/api/hr/${clean.replace(/^\//, '')}`;
}

// ============================================================================
// 2. TYPES
// ============================================================================
export type FindingCategory =
  | 'direct-mock-store'
  | 'mock-adapter-call'
  | 'inline-hardcoded-data'
  | 'mock-real-branching';

export type FindingStatus = 'already-wired' | 'still-mock' | 'hardcoded — no endpoint yet';

export interface Finding {
  filePath: string;
  line: number;
  category: FindingCategory;
  snippet: string;
  subModule: string;
  realEndpoint: string;
  status: FindingStatus;
  description: string;
}

// ============================================================================
// 3. SUB-MODULE INFERENCE
// ============================================================================
function inferSubModule(filePath: string): string {
  const norm = filePath.replace(/\\/g, '/');

  if (norm.includes('src/lib/mockHrStore')) return 'Core Mock Infrastructure';
  if (norm.includes('src/lib/axios') || norm.includes('src/lib/hrApiClient')) return 'Core HTTP Client';
  if (norm.includes('/deployment')) return 'Manpower Deployment';
  if (norm.includes('/employee')) return 'Employee Directory';
  if (norm.includes('/myAttendance')) return 'My Attendance';
  if (norm.includes('/attendance')) return 'Attendance Management';
  if (norm.includes('/leaveManagement')) return 'Leave Management';
  if (norm.includes('/leaving')) return 'Leaving & Resignation';
  if (norm.includes('/afterLeavingWork')) return 'After Leaving Work';
  if (norm.includes('/joining')) return 'Joining & Onboarding';
  if (norm.includes('/afterJoiningWork')) return 'After Joining Work';
  if (norm.includes('/mySalary')) return 'My Salary & Payslips';
  if (norm.includes('/salaryManagement')) return 'Salary Management';
  if (norm.includes('/payroll')) return 'Payroll Processing';
  if (norm.includes('/advanceApproval')) return 'Advance Approval';
  if (norm.includes('/advanceRequest')) return 'Advance Request';
  if (norm.includes('/gatePassRequest')) return 'Gate Pass Request';
  if (norm.includes('/gatePass')) return 'Gate Pass Management';
  if (norm.includes('/indent')) return 'Job Requisition (Indent)';
  if (norm.includes('/findEnquiry')) return 'Candidate Pipeline & Enquiry';
  if (norm.includes('/callTracker')) return 'Candidate Call Tracker';
  if (norm.includes('/socialSite')) return 'Social Site Postings';
  if (norm.includes('/dashboard')) return 'HR Dashboard';
  if (norm.includes('/companyCalendar')) return 'Company Calendar';
  if (norm.includes('/letterFormatter')) return 'Letter Formatter';
  if (norm.includes('/misReport') || norm.includes('/report')) return 'HR MIS Reports';
  if (norm.includes('/myProfile')) return 'My Profile';
  if (norm.includes('/_shared')) return 'Shared HR Components';
  if (norm.includes('src/systems/hr')) return 'HR System Shell & Navigation';

  return 'Other HR Feature';
}

// ============================================================================
// 4. SCANNER & DETECTION LOGIC
// ============================================================================

function cleanSnippet(line: string): string {
  return line.trim().slice(0, 140);
}

function scanFile(absolutePath: string): Finding[] {
  const relPath = relative(ROOT, absolutePath).replace(/\\/g, '/');
  const content = readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');
  const findings: Finding[] = [];
  const subModule = inferSubModule(relPath);

  // Skip self
  if (relPath.includes('audit-hr-mock-data')) return [];

  // Special scan for src/lib/mockHrStore.ts itself
  if (relPath.endsWith('src/lib/mockHrStore.ts')) {
    findings.push({
      filePath: relPath,
      line: 1,
      category: 'direct-mock-store',
      snippet: 'export const mockHrStore = new MockHrStore();',
      subModule,
      realEndpoint: 'Entire Mock Store (in-memory database)',
      status: 'still-mock',
      description: 'Central in-memory mock store for employees, indents, leaves, advances, etc.',
    });
    return findings;
  }

  // Special scan for src/lib/axios.ts
  if (relPath.endsWith('src/lib/axios.ts')) {
    lines.forEach((line, index) => {
      if (line.includes('/hrfms/')) {
        findings.push({
          filePath: relPath,
          line: index + 1,
          category: 'mock-real-branching',
          snippet: cleanSnippet(line),
          subModule,
          realEndpoint: 'master-backend /api/hr',
          status: 'still-mock',
          description: 'Graceful fallback interceptor returning empty mock response on 404 for unmigrated /hrfms/* endpoints',
        });
      }
    });
    return findings;
  }

  // Standard scan for files in src/features/hr and src/systems/hr
  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const line = rawLine.trim();

    // ------------------------------------------------------------------------
    // Category 1: Direct mock-store usage
    // ------------------------------------------------------------------------
    if (
      (line.includes('mockHrStore') && !line.startsWith('//') && !line.startsWith('/*')) ||
      (line.includes('from') && line.includes('mockHrStore'))
    ) {
      findings.push({
        filePath: relPath,
        line: lineNum,
        category: 'direct-mock-store',
        snippet: cleanSnippet(rawLine),
        subModule,
        realEndpoint: 'needs backend API / query hook',
        status: 'still-mock',
        description: 'Direct import or usage of in-memory mockHrStore',
      });
      return;
    }

    // ------------------------------------------------------------------------
    // Category 2: Mock-adapter-routed calls & real HR API client calls
    // ------------------------------------------------------------------------
    // Matches string literals that represent HR route paths:
    // - /hrfms/*
    // - /assignments/* or /assignments
    // - /employees/* or /employees
    // - /project-assignment/* or /project-assignment
    const routeMatch = line.match(/(['"`])(\/(?:hrfms|assignments|employees|employee|project-assignment)(?:[\/\?a-zA-Z0-9_\-\/${}]*)?)\1/);
    if (routeMatch) {
      const routePath = routeMatch[2];
      const realRoute = deriveRealEndpoint(routePath);
      const isReal = isKnownRealEndpoint(realRoute);

      findings.push({
        filePath: relPath,
        line: lineNum,
        category: 'mock-adapter-call',
        snippet: cleanSnippet(rawLine),
        subModule,
        realEndpoint: realRoute,
        status: isReal ? 'already-wired' : 'still-mock',
        description: isReal
          ? `Already wired to real database endpoint ${realRoute}`
          : `Mock-routed endpoint ${routePath} awaiting backend controller implementation`,
      });
      return;
    }

    // ------------------------------------------------------------------------
    // Category 3: Inline hardcoded data
    // ------------------------------------------------------------------------
    // Check for explicit // MOCK: or // DUMMY: comment convention
    if (/\/\/\s*(MOCK|DUMMY|SAMPLE):/i.test(rawLine)) {
      findings.push({
        filePath: relPath,
        line: lineNum,
        category: 'inline-hardcoded-data',
        snippet: cleanSnippet(rawLine),
        subModule,
        realEndpoint: 'unknown — needs backend',
        status: 'hardcoded — no endpoint yet',
        description: 'Explicitly flagged mock/dummy comment tag',
      });
      return;
    }

    // Check for variable declarations of mock/dummy data arrays or records
    // e.g.: const DUMMY_LEAVE_REQUESTS: LeaveRequest[] = [
    //       const mockPayrollData: PayrollRecord[] = [];
    //       const INITIAL_EVENTS: CalendarEvent[] = [
    //       const initialGatePasses: GatePassItem[] = [
    //       const initialAccounts: SocialAccount[] = [
    //       const sampleNames = [
    const inlineDataDecl = line.match(
      /(?:const|let|var)\s+([A-Za-z0-9_]*(?:mock|dummy|sample|fake|seed|preset|initial)[A-Za-z0-9_]*)\s*(?::\s*[^=]+)?=\s*(\[|\{)/i
    );

    if (inlineDataDecl) {
      const varName = inlineDataDecl[1];
      // Filter out form states like INITIAL_FORM: FormState = {
      const isFormState = /(?:form|formstate|filter|state)$/i.test(varName) && !line.includes('[');
      const isColumnDef = /columns/i.test(varName);

      if (!isFormState && !isColumnDef) {
        findings.push({
          filePath: relPath,
          line: lineNum,
          category: 'inline-hardcoded-data',
          snippet: cleanSnippet(rawLine),
          subModule,
          realEndpoint: 'unknown — needs backend',
          status: 'hardcoded — no endpoint yet',
          description: `Inline hardcoded dataset variable "${varName}" embedded in component`,
        });
        return;
      }
    }

    // ------------------------------------------------------------------------
    // Category 4: Mock/real branching
    // ------------------------------------------------------------------------
    const branchingMatch = line.match(
      /\b(USE_MOCK|isMock|ENABLE_MOCK|VITE_USE_MOCK|mockMode|useMockData)\b/
    );
    if (branchingMatch) {
      findings.push({
        filePath: relPath,
        line: lineNum,
        category: 'mock-real-branching',
        snippet: cleanSnippet(rawLine),
        subModule,
        realEndpoint: 'unknown — needs backend',
        status: 'still-mock',
        description: `Conditional feature flag / branching check on "${branchingMatch[1]}"`,
      });
    }
  });

  return findings;
}

// ============================================================================
// 5. DIRECTORY RECURSION
// ============================================================================
function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!existsSync(dir)) return results;

  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      if (/\.(ts|tsx|js|jsx)$/.test(file) && !file.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ============================================================================
// 6. MAIN EXECUTION & REPORT GENERATION
// ============================================================================
function run() {
  console.log('🔍 Scanning HR Frontend for dummy/mock data connections...');

  const targets = [
    join(ROOT, 'src/features/hr'),
    join(ROOT, 'src/systems/hr'),
    join(ROOT, 'src/lib/axios.ts'),
    join(ROOT, 'src/lib/mockHrStore.ts'),
  ];

  let filesToScan: string[] = [];

  for (const target of targets) {
    if (!existsSync(target)) continue;
    const stat = statSync(target);
    if (stat.isDirectory()) {
      filesToScan = filesToScan.concat(getFilesRecursively(target));
    } else {
      filesToScan.push(target);
    }
  }

  // Remove duplicates
  filesToScan = Array.from(new Set(filesToScan));
  console.log(`📁 Found ${filesToScan.length} source files to inspect.`);

  const allFindings: Finding[] = [];
  for (const file of filesToScan) {
    const fileFindings = scanFile(file);
    allFindings.push(...fileFindings);
  }

  // Summary statistics
  const stats = {
    totalFindings: allFindings.length,
    byCategory: {
      'direct-mock-store': allFindings.filter((f) => f.category === 'direct-mock-store').length,
      'mock-adapter-call': allFindings.filter((f) => f.category === 'mock-adapter-call').length,
      'inline-hardcoded-data': allFindings.filter((f) => f.category === 'inline-hardcoded-data').length,
      'mock-real-branching': allFindings.filter((f) => f.category === 'mock-real-branching').length,
    },
    byStatus: {
      'already-wired': allFindings.filter((f) => f.status === 'already-wired').length,
      'still-mock': allFindings.filter((f) => f.status === 'still-mock').length,
      'hardcoded — no endpoint yet': allFindings.filter((f) => f.status === 'hardcoded — no endpoint yet').length,
    },
  };

  console.log('\n📊 Scan Complete:');
  console.log(`   Total items detected: ${stats.totalFindings}`);
  console.log(`   - Already wired to real backend: ${stats.byStatus['already-wired']}`);
  console.log(`   - Still mock (awaiting backend): ${stats.byStatus['still-mock']}`);
  console.log(`   - Inline hardcoded / no endpoint yet: ${stats.byStatus['hardcoded — no endpoint yet']}`);

  // Create reports folder if not exists
  const reportsDir = join(ROOT, 'reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  // --------------------------------------------------------------------------
  // Output 1: Machine-readable JSON
  // --------------------------------------------------------------------------
  const jsonReportPath = join(reportsDir, 'hr-mock-inventory.json');
  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    summary: stats,
    knownRealEndpointsCount: KNOWN_REAL_HR_ENDPOINTS.length,
    findings: allFindings,
  };
  writeFileSync(jsonReportPath, JSON.stringify(jsonPayload, null, 2), 'utf8');
  console.log(`\n💾 Saved JSON inventory to: ${relative(ROOT, jsonReportPath)}`);

  // --------------------------------------------------------------------------
  // Output 2: Human-readable Markdown Checklist
  // --------------------------------------------------------------------------
  const mdReportPath = join(reportsDir, 'hr-mock-inventory.md');

  // Group findings by sub-module
  const groupedByModule: Record<string, Finding[]> = {};
  for (const finding of allFindings) {
    if (!groupedByModule[finding.subModule]) {
      groupedByModule[finding.subModule] = [];
    }
    groupedByModule[finding.subModule].push(finding);
  }

  const moduleNames = Object.keys(groupedByModule).sort();

  let md = `# HR Frontend Mock & Dummy Data Inventory\n\n`;
  md += `> **Generated**: ${new Date().toLocaleString()}  \n`;
  md += `> **Purpose**: Working checklist of all dummy/mock data connections in the HR frontend to replace module-by-module with real \`master-backend\` endpoints.\n\n`;

  md += `## 📈 Overall Progress\n\n`;
  const completionPct = stats.totalFindings > 0 ? Math.round((stats.byStatus['already-wired'] / stats.totalFindings) * 100) : 0;
  md += `- **Total Connections Audited**: \`${stats.totalFindings}\`\n`;
  md += `- **Already Wired to Real Backend**: \`${stats.byStatus['already-wired']}\` (${completionPct}%)\n`;
  md += `- **Still Mock (Calls /hrfms/* awaiting backend)**: \`${stats.byStatus['still-mock']}\`\n`;
  md += `- **Inline Hardcoded Data (No endpoint yet)**: \`${stats.byStatus['hardcoded — no endpoint yet']}\`\n\n`;

  md += `| Category | Count |\n`;
  md += `| :--- | :--- |\n`;
  md += `| Direct Mock Store Usage (\`direct-mock-store\`) | ${stats.byCategory['direct-mock-store']} |\n`;
  md += `| Mock Adapter Route Calls (\`mock-adapter-call\`) | ${stats.byCategory['mock-adapter-call']} |\n`;
  md += `| Inline Hardcoded Data (\`inline-hardcoded-data\`) | ${stats.byCategory['inline-hardcoded-data']} |\n`;
  md += `| Mock/Real Branching Flags (\`mock-real-branching\`) | ${stats.byCategory['mock-real-branching']} |\n\n`;

  md += `## 📋 Sub-Module Checklists\n\n`;

  for (const mod of moduleNames) {
    const items = groupedByModule[mod];
    const wiredCount = items.filter((i) => i.status === 'already-wired').length;
    const pendingCount = items.length - wiredCount;

    md += `### ${mod} (${wiredCount}/${items.length} wired)\n\n`;
    if (pendingCount === 0) {
      md += `> 🟢 **Fully wired to real backend!**\n\n`;
    }

    md += `| Status | Location | Category | Code Snippet | Expected Real Endpoint |\n`;
    md += `| :---: | :--- | :--- | :--- | :--- |\n`;

    for (const item of items) {
      const isDone = item.status === 'already-wired';
      const checkMark = isDone ? '[x]' : '[ ]';
      const statusBadge = isDone
        ? '`already-wired`'
        : item.status === 'still-mock'
        ? '`still-mock`'
        : '`hardcoded`';
      const cleanSnippetEscaped = item.snippet
        .replace(/\|/g, '\\|')
        .replace(/`/g, "'")
        .slice(0, 70);

      md += `| - ${checkMark} | [\`${item.filePath}:${item.line}\`](file:///${resolve(ROOT, item.filePath).replace(/\\/g, '/')}#L${item.line}) | \`${item.category}\` | \`${cleanSnippetEscaped}\` | \`${item.realEndpoint}\` |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 💡 Migration Process & Next Steps\n\n`;
  md += `1. **Wire Sub-Module in Backend**: Implement the controller, routes, and Prisma schema in \`master-backend/src/modules/hr\`.\n`;
  md += `2. **Update Frontend API Client**: Point the feature's API calls to the real endpoint (or \`hrApiClient\`).\n`;
  md += `3. **Re-run Audit**: Execute \`npx tsx scripts/audit-hr-mock-data.ts\` to verify that items flip from \`still-mock\` to \`already-wired\`.\n`;

  writeFileSync(mdReportPath, md, 'utf8');
  console.log(`📝 Saved Markdown checklist to: ${relative(ROOT, mdReportPath)}`);
  console.log('✅ Audit script completed successfully!\n');
}

run();
