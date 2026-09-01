import type { SystemManifest } from '@/shared/types/systemManifest';

export const StoreSystemManifest: SystemManifest = {
  id: 'store',
  name: 'Store Management System',
  description: 'Inventory control, indent approvals, purchase orders, store check-in/issue, and financial audits',
  version: '2.0.0',
  iconName: 'Store',
  themeColor: 'blue',
  basePath: '/store',
  defaultRoute: '/store/dashboard',
  gateKey: 'inventory',
  navGroups: [
    {
      id: 'enquiry',
      title: 'Enquiry',
      items: [
        { id: 'enquiry', name: 'Enquiry / Quotation', path: '/store/procurement/enquiry', gateKey: 'createPo' },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      items: [
        { id: 'stock', name: 'Stock Balance', path: '/store/inventory/stock', gateKey: 'inventory' },
        { id: 'issue', name: 'Store Issue', path: '/store/inventory/issue', gateKey: 'storeIssue' },
        { id: 'issue-return', name: 'Store Issue Return', path: '/store/inventory/issue-return', gateKey: 'storeIssueReturn' },
        { id: 'issue-data', name: 'Store Data', path: '/store/inventory/issue-data', gateKey: 'issueData' },
      ],
    },
    {
      id: 'indents',
      title: 'Requisitions & Indents',
      items: [
        { id: 'create', name: 'Create Indent', path: '/store/indents/create', gateKey: 'createIndent' },
        { id: 'approve', name: 'Indent Approval', path: '/store/indents/approve', gateKey: 'indentApprovalView' },
        { id: 'vendor-rates', name: 'Vendor Rate Update', path: '/store/indents/vendor-rates', gateKey: 'updateVendorView' },
        { id: 'technical-approval', name: 'Technical Approval', path: '/store/indents/technical-approval', gateKey: 'threePartyApprovalView' },
        { id: 'management-approval', name: 'Management Approval', path: '/store/indents/management-approval', gateKey: 'threePartyApprovalView' },
      ],
    },
    {
      id: 'procurement',
      title: 'Procurement & PO',
      items: [
        { id: 'pending-po', name: 'Pending PO to Make', path: '/store/procurement/pending-po', gateKey: 'pendingPo' },
        { id: 'create-po', name: 'Create PO', path: '/store/procurement/create-po', gateKey: 'createPo' },
        { id: 'po-history', name: 'PO History', path: '/store/procurement/po-history', gateKey: 'ordersView' },
        { id: 'lifting', name: 'Lifting', path: '/store/procurement/lifting', gateKey: 'ordersView' },
      ],
    },
    {
      id: 'receipts',
      title: 'Store Receipts (GRN)',
      items: [
        { id: 'store-in', name: 'Store Check (GRN)', path: '/store/receipts/store-in', gateKey: 'storeIn' },
        { id: 'hod-check', name: 'HOD Check', path: '/store/receipts/hod-check', gateKey: 'hodStoreApproval' },
        { id: 'grn-rejection', name: 'Reject For GRN', path: '/store/receipts/grn-rejection', gateKey: 'insteadOfQualityCheckInReceivedItem' },
        { id: 'bill-pending', name: 'Bill Not Received', path: '/store/receipts/bill-pending', gateKey: 'billNotReceived' },
      ],
    },
    {
      id: 'finance',
      title: 'Finance & Payments',
      items: [
        { id: 'make-payment', name: 'Make Payment', path: '/store/finance/make-payment', gateKey: 'makePayment' },
        { id: 'freight-payment', name: 'Freight Payment', path: '/store/finance/freight-payment', gateKey: 'fullKiting' },
        { id: 'debit-note', name: 'Send Debit Note', path: '/store/finance/debit-note', gateKey: 'sendDebitNote' },
      ],
    },
    {
      id: 'auditing',
      title: 'Auditing & Tally',
      items: [
        { id: 'audit-data', name: 'Audit Data', path: '/store/auditing/audit-data', gateKey: 'auditData' },
        { id: 'tally-entry', name: 'Take Entry By Tally', path: '/store/auditing/tally-entry', gateKey: 'takeEntryByTelly' },
        { id: 'pc-report', name: 'DB For PC', path: '/store/auditing/pc-report', gateKey: 'dbForPc' },
      ],
    },
    {
      id: 'admin',
      title: 'Store Administration',
      items: [
        { id: 'master-registry', name: 'Master Registry', path: '/store/admin/master-registry', gateKey: 'masterRegistry' },
      ],
    },
    {
      id: 'master-settings',
      title: 'Master Settings',
      items: [
        { id: 'manage-users', name: 'Manage Users', path: '/store/admin/manage-users', gateKey: 'manageUsers' },
      ],
    },
  ],
};
