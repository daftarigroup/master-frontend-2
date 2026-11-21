// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { pmsApi } from '../../services/pmsApi';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  FileText, Clock, Search, CheckCircle2, RefreshCw,
  Calendar as CalendarIcon, Plus, Trash2, Eye, Pencil, Save, X, Loader2,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn, formatDate } from '@/lib/utils';
import POPdf, { type POPdfProps } from '@/components/element/POPdf';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { emailApi } from '@/lib/apiClient';
import { fetchContractVendors } from '../../utils/contractVendors';
import { upsertExternalPurchaseOrder, saveProductsForPONumber } from '../../utils/storageManager';
import { getActiveProject } from '../../utils/activeProject';

// ── Financial Year & Number Helpers ──────────────────────────────────────────

function getFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, April is 3
  let startYear, endYear;
  if (month >= 3) {
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }
  return `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
}

function generateNextPoNumber(existingPOs: any[], kind: 'po' | 'contract' = 'po'): string {
  if (kind === 'contract') {
    const cp = `CON/${getFinancialYear()}/`;
    const mx = (existingPOs || []).map((p) => String(p.po_number || p.poNumber || '').trim()).filter((n) => n.startsWith(cp)).map((n) => parseInt(n.slice(cp.length), 10) || 0);
    return `${cp}${String((mx.length ? Math.max(...mx) : 0) + 1).padStart(2, '0')}`;
  }
  const fy = getFinancialYear();
  const prefix = `${fy}/`;

  if (!existingPOs || existingPOs.length === 0) {
    return `${prefix}06`; // Default matching prototype baseline
  }

  const existingNums = existingPOs
    .map((p) => {
      const numStr = String(p.po_number || p.poNumber || '').trim();
      if (numStr.startsWith(prefix)) {
        const after = numStr.replace(prefix, '').trim();
        const base = after.split('-')[0];
        const n = parseInt(base, 10);
        return isNaN(n) ? 0 : n;
      }
      return 0;
    })
    .filter((n) => n > 0);

  const max = existingNums.length > 0 ? Math.max(...existingNums) : 5;
  const nextNum = max + 1;
  return `${prefix}${String(nextNum).padStart(2, '0')}`;
}

function incrementPoRevision(basePoNumber: string, allPOs: any[]): string {
  const parts = basePoNumber.split('/');
  if (parts.length < 2) return `${basePoNumber}-01`;
  const fyPart = parts[0];
  const rest = parts[1];
  const baseNum = rest.split('-')[0];
  const basePo = `${fyPart}/${baseNum}`;

  const related = (allPOs || [])
    .map((p) => String(p.po_number || p.poNumber || '').trim())
    .filter((n) => n === basePo || n.startsWith(`${basePo}-`));

  const revisions = related.map((num) => {
    if (num === basePo) return 0;
    const suffix = num.replace(`${basePo}-`, '');
    const n = parseInt(suffix, 10);
    return isNaN(n) ? 0 : n;
  });

  const maxRev = revisions.length > 0 ? Math.max(...revisions) : 0;
  return `${basePo}-${String(maxRev + 1).padStart(2, '0')}`;
}

function calculateRowAmount(qty: number, rate: number, disc: number, gst: number) {
  const discountedRate = rate * (1 - (disc || 0) / 100);
  const baseAmount = (qty || 0) * discountedRate;
  const gstAmount = baseAmount * ((gst || 0) / 100);
  return baseAmount + gstAmount;
}

const DEFAULT_TERMS = [
  'Material to be supplied strictly as per approved specifications.',
  'Inspection will be conducted on site before acceptance.',
  'Taxes and freight included as per agreed quotation.',
  'Damaged or non-compliant material will be replaced by supplier at no extra cost.',
];

// Fallback suppliers for demonstration when DB indents are empty
const FALLBACK_SUPPLIERS = [
  {
    name: 'Ultratech Cement Ltd',
    address: 'Plot No. 12, Bhosari MIDC, Pune - 411026',
    gstin: '27AAACU1234F1Z8',
    email: 'sales.pune@ultratech.com',
    project: 'Pooja Heritage Project',
    destination: 'Site Office, Sector 4, Baner, Pune - 411045',
    engineer: { name: 'Er. Rajesh Patil', phone: '9822012345', email: 'rajesh.p@poojaconstruction.com' },
    contractor: { name: 'Shree Sai Construction', phone: '9890123456', email: 'contact@shreesai.com' },
    subContractor: { name: 'Apex Civil Works', phone: '9765432100', email: 'info@apexcivil.com' },
    items: [
      {
        indent_number: 'PI-0021',
        quotation_number: 'Q-UTC-2026-88',
        product_name: 'OPC 53 Grade Cement',
        quantity: 500,
        uom: 'Bags',
        rate: 380,
        gst_percent: 28,
        discount_percent: 2,
        payment_terms: '30 Days Net',
      },
      {
        indent_number: 'PI-0022',
        quotation_number: 'Q-UTC-2026-89',
        product_name: 'PPC Cement',
        quantity: 200,
        uom: 'Bags',
        rate: 350,
        gst_percent: 28,
        discount_percent: 0,
        payment_terms: '30 Days Net',
      },
    ],
  },
  {
    name: 'Tata Steel Rebars Pvt Ltd',
    address: 'Survey 44, Hinjawadi Phase 2, Pune - 411057',
    gstin: '27AAACT9876K1Z2',
    email: 'orders@tatasteelrebars.com',
    project: 'Pooja Horizon Tech Park',
    destination: 'Gate 2, Hinjawadi IT Park, Pune - 411057',
    engineer: { name: 'Er. Sameer Kulkarni', phone: '9822998877', email: 'sameer.k@poojaconstruction.com' },
    contractor: { name: 'BuildWell Infrastructure', phone: '9823001122', email: 'info@buildwell.in' },
    subContractor: { name: 'Delta Fabricators', phone: '9988776655', email: 'delta@fabricators.com' },
    items: [
      {
        indent_number: 'PI-0025',
        quotation_number: 'TS-2026-PO-441',
        product_name: 'TMT 16mm Fe550D Steel Rebars',
        quantity: 15,
        uom: 'MT',
        rate: 54000,
        gst_percent: 18,
        discount_percent: 1.5,
        payment_terms: '15 Days Net',
      },
    ],
  },
];

export default function PmsCreatePOView({ prefill, onCreated, variant = 'po', editPo = null }: { prefill?: { indentId: any; itemId: any } | null; onCreated?: () => void; variant?: 'po' | 'contract'; editPo?: any } = {}) {
  const isContract = variant === 'contract';
  const [mode, setMode] = useState<'create' | 'revise'>('create');

  // Main Form State
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [supplierName, setSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Commercial 5-Card Details State
  const [projectName, setProjectName] = useState('Project Name');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isEditingDestination, setIsEditingDestination] = useState(false);

  // Card 3: Site Incharge
  const [siteEngineerName, setSiteEngineerName] = useState('');
  const [siteEngineerPhone, setSiteEngineerPhone] = useState('');
  const [siteEngineerEmail, setSiteEngineerEmail] = useState('');

  // Card 4: Contractor
  const [contractorName, setContractorName] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [contractorEmail, setContractorEmail] = useState('');

  // Card 5: Sub Contractor
  const [subContractorName, setSubContractorName] = useState('');
  const [subContractorPhone, setSubContractorPhone] = useState('');
  const [subContractorEmail, setSubContractorEmail] = useState('');

  // Description
  const [description, setDescription] = useState('');

  // Line items table
  const [lineItems, setLineItems] = useState<any[]>([]);

  // Terms
  const [terms, setTerms] = useState<string[]>([...DEFAULT_TERMS]);
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [newTermHeading, setNewTermHeading] = useState('');
  const [newTermCondition, setNewTermCondition] = useState('');

  // Revise Mode state
  const [selectedPoToRevise, setSelectedPoToRevise] = useState('');

  // Data Loading & API State
  const [existingPOs, setExistingPOs] = useState<any[]>([]);
  const [approvedIndents, setApprovedIndents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedIndent, setSelectedIndent] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [contractVendors, setContractVendors] = useState<any[]>([]);
  useEffect(() => { if (isContract) fetchContractVendors().then(setContractVendors); }, [isContract]);

  // Preview Dialog
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<POPdfProps | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Initial Data Load ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [posRes, indentsRes, projectsRes] = await Promise.all([
        pmsApi.get('/pos?scope=all'), // all POs: PO numbers must stay unique across projects
        pmsApi.get('/indents?stage=ManagementApproved'),
        pmsApi.get('/projects'),
      ]);

      const poList = Array.isArray(posRes) ? posRes : posRes?.data || [];
      const indentList = Array.isArray(indentsRes) ? indentsRes : indentsRes?.data || [];
      const projectList = Array.isArray(projectsRes) ? projectsRes : projectsRes?.data || [];

      setExistingPOs(poList);
      setApprovedIndents(indentList);
      setProjects(projectList);

      if (mode === 'create' && !editPo) {
        const nextPo = generateNextPoNumber(poList, variant);
        setPoNumber(nextPo);
      }
    } catch (e) {
      console.warn('Error loading PMS PO data:', e);
    } finally {
      setLoadingData(false);
    }
  }, [mode, variant]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // Handle Mode Change (Create <-> Revise)
  const handleModeChange = (newMode: 'create' | 'revise') => {
    setMode(newMode);
    if (newMode === 'create') {
      const nextPo = generateNextPoNumber(existingPOs, variant);
      setPoNumber(nextPo);
      setSelectedPoToRevise('');
    } else {
      if (existingPOs.length > 0) {
        const firstPo = existingPOs[0];
        const poNo = firstPo.po_number || firstPo.poNumber || '';
        setSelectedPoToRevise(poNo);
        loadPoForRevision(firstPo);
      } else {
        toast.info('No existing POs available to revise');
      }
    }
  };

  // Populate form from existing PO in Revise mode
  const loadPoForRevision = (po: any) => {
    if (!po) return;
    const basePo = po.po_number || po.poNumber || '';
    const revisedNumber = incrementPoRevision(basePo, existingPOs);
    setPoNumber(revisedNumber);
    setPoDate(po.po_date ? format(new Date(po.po_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setSupplierName(po.vendor_name || po.supplierName || '');
    setSupplierAddress(po.vendor_address || po.supplierAddress || '');
    setSupplierGstin(po.vendor_gstin || po.gstin || '');
    setSupplierEmail(po.vendor_email || po.companyEmail || '');
    setDeliveryDate(po.delivery_date ? format(new Date(po.delivery_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

    setProjectName(po.project_name || po.projectName || 'Project Name');
    setDestinationAddress(po.destination_address || po.deliveryAddress || '');

    setSiteEngineerName(po.site_engineer_name || '');
    setSiteEngineerPhone(po.site_engineer_phone || '');
    setSiteEngineerEmail(po.site_engineer_email || '');

    setContractorName(po.contractor_name || '');
    setContractorPhone(po.contractor_phone || '');
    setContractorEmail(po.contractor_email || '');

    setSubContractorName(po.sub_contractor_name || '');
    setSubContractorPhone(po.sub_contractor_phone || '');
    setSubContractorEmail(po.sub_contractor_email || '');

    setDescription(po.remarks || po.description || '');

    if (Array.isArray(po.items) && po.items.length > 0) {
      setLineItems(
        po.items.map((it: any) => ({
          indent_number: it.indent_number || it.internalCode || 'N/A',
          quotation_number: it.quotation_number || '',
          product_name: it.product_name || it.product || 'Product',
          quantity: Number(it.quantity || it.qty || 1),
          uom: it.uom || it.unit || 'Nos',
          rate: Number(it.rate || 0),
          gst_percent: Number(it.gst_percent || it.gst || 0),
          discount_percent: Number(it.discount_percent || it.discount || 0),
          amount: Number(it.amount || 0),
          payment_terms: it.payment_terms || '',
        }))
      );
    }

    if (Array.isArray(po.terms) && po.terms.length > 0) {
      setTerms(po.terms.map((t: any) => (typeof t === 'string' ? t : t.text || `${t.title}: ${t.name}`)));
    }
  };

  // ── Available Suppliers ──────────────────────────────────────────────────────

  const availableSuppliers = useMemo(() => {
    const list: Array<{
      name: string;
      address: string;
      gstin: string;
      email: string;
      project: string;
      destination: string;
      engineer?: { name: string; phone: string; email: string };
      contractor?: { name: string; phone: string; email: string };
      subContractor?: { name: string; phone: string; email: string };
      items: any[];
      indentObj?: any;
    }> = [];

    if (isContract) {
      return contractVendors.map((v) => ({
        name: v.name, address: v.address, gstin: v.gstin, email: v.email,
        project: getActiveProject()?.name || getActiveProject()?.project_name || 'Project Name',
        destination: '', items: v.items.map((it) => ({ ...it, indent_number: 'CONTRACT', quotation_number: '', payment_terms: '', amount: calculateRowAmount(it.quantity, it.rate, it.discount_percent, it.gst_percent) })),
      }));
    }

    // 1. Extract from approved PMS indents
    approvedIndents.forEach((ind: any) => {
      // Only approved items that don't have a PO yet; one supplier entry per approved vendor
      const open = (Array.isArray(ind.items) ? ind.items : []).filter(
        (it: any) => it.indent_status === 'Approved' && (!it.approval_status || it.approval_status === 'Approved') && !(it.po_number && String(it.po_number).trim())
      );
      const byVendor = new Map<string, any[]>();
      open.forEach((it: any) => {
        const vn = it.approved_vendor_name || ind.approved_vendor_name || ind.selected_vendor?.vendor_name || ind.vendors?.[0]?.vendor_name;
        if (!vn || !String(vn).trim()) return;
        byVendor.set(vn, [...(byVendor.get(vn) || []), it]);
      });
      byVendor.forEach((vendorItems, vendorName) => {
        const vendorData = ind.vendors?.find((v: any) => v.vendor_name === vendorName) || ind.selected_vendor || {};
        const proj = projects.find((p: any) => String(p.id) === String(ind.project_id)) || {};
        const sub = (proj.sub_contractors || proj.subContractors || [])[0] || {};
        const gst = Number(vendorData.gst_percent || 18);
        list.push({
          name: vendorName,
          address: vendorData.address || ind.vendor_address || '',
          gstin: vendorData.gstin || ind.vendor_gstin || '',
          email: vendorData.email || ind.vendor_email || '',
          project: ind.project_name || 'Project Name',
          destination: ind.site_address || ind.project_location || proj.project_location || proj.projectLocation || '',
          engineer: {
            name: ind.site_engineer_name || ind.indenter_name || '',
            phone: ind.site_engineer_phone || '',
            email: ind.site_engineer_email || '',
          },
          contractor: {
            name: ind.contractor_name || proj.contractor_name || proj.contractorName || '',
            phone: ind.contractor_phone || proj.contractor_phone || proj.contractorPhone || '',
            email: ind.contractor_email || proj.contractor_email || proj.contractorEmail || '',
          },
          subContractor: {
            name: ind.sub_contractor_name || sub.name || '',
            phone: ind.sub_contractor_phone || sub.phone || '',
            email: ind.sub_contractor_email || sub.email || '',
          },
          items: vendorItems.map((it: any) => {
            const qty = Number(it.quantity || 1);
            const rate = Number(it.approved_rate || ind.approved_rate || vendorData.rate || 0); // approved rate comes from the approval step
            return {
              item_id: it.id,
              indent_item_id: it.id,
              indent_number: ind.indent_number || `PI-${ind.id}`,
              quotation_number: '',
              product_name: it.product_name,
              quantity: qty,
              uom: it.uom || 'Nos',
              rate,
              gst_percent: gst,
              discount_percent: 0,
              amount: calculateRowAmount(qty, rate, 0, gst),
              payment_terms: vendorData.payment_terms || '30 Days Net',
            };
          }),
          indentObj: ind,
        });
      });
    });

    // 2. Add fallbacks if empty or to ensure rich supplier selection
    if (!isContract) FALLBACK_SUPPLIERS.forEach((f) => {
      if (!list.some((existing) => existing.name.toLowerCase() === f.name.toLowerCase())) {
        list.push(f);
      }
    });

    return list;
  }, [approvedIndents, projects, contractVendors, isContract]);

  // Handle supplier change
  const handleSelectSupplier = (selectedName: string) => {
    applySupplierEntry(availableSuppliers.find((s) => s.name === selectedName));
  };

  const applySupplierEntry = (found: any, onlyItemId?: any) => {
    if (!found) return;
    setSupplierName(found.name);

    setSupplierAddress(found.address || '');
    setSupplierGstin(found.gstin || '');
    setSupplierEmail(found.email || '');
    setProjectName(found.project || 'Project Name');
    setDestinationAddress(found.destination || '');
    setSelectedIndent(found.indentObj || null);

    if (found.engineer) {
      setSiteEngineerName(found.engineer.name || '');
      setSiteEngineerPhone(found.engineer.phone || '');
      setSiteEngineerEmail(found.engineer.email || '');
    }

    if (found.contractor) {
      setContractorName(found.contractor.name || '');
      setContractorPhone(found.contractor.phone || '');
      setContractorEmail(found.contractor.email || '');
    }

    if (found.subContractor) {
      setSubContractorName(found.subContractor.name || '');
      setSubContractorPhone(found.subContractor.phone || '');
      setSubContractorEmail(found.subContractor.email || '');
    }

    const matched =
      onlyItemId != null ? (found.items || []).filter((it: any) => it.item_id === onlyItemId) : [];
    const sourceItems = matched.length > 0 ? matched : found.items;

    if (sourceItems && sourceItems.length > 0) {
      setLineItems(
        sourceItems.map((it) => ({
          ...it,
          amount: calculateRowAmount(it.quantity, it.rate, it.discount_percent, it.gst_percent),
        }))
      );
    } else {
      setLineItems([]);
    }
  };

  // Edit mode (contract history): load the saved contract once
  const editDone = useRef(false);
  useEffect(() => {
    if (!editPo || editDone.current) return;
    editDone.current = true;
    loadPoForRevision(editPo);
    setPoNumber(editPo.po_number || editPo.poNumber || '');
  }, [editPo]);

  // Autofill from the Pending PO queue row the user clicked
  const location = useLocation();
  const prefillDone = useRef(false);
  useEffect(() => {
    const st: any = prefill ?? location.state;
    if (prefillDone.current || !st?.indentId || approvedIndents.length === 0) return;
    const entry = availableSuppliers.find((s) => s.indentObj && s.indentObj.id === st.indentId && (st.itemId == null || (s.items || []).some((it: any) => it.item_id === st.itemId)));
    prefillDone.current = true;
    if (entry) applySupplierEntry(entry, st.itemId);
    else toast.info('Selected indent could not be loaded; pick a supplier manually');
  }, [location.state, prefill, approvedIndents, availableSuppliers]);

  // ── Line Items Handlers ──────────────────────────────────────────────────────

  const updateItem = (index: number, field: string, value: any) => {
    setLineItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const updated = { ...it, [field]: value };
        const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
        const rate = Number(field === 'rate' ? value : updated.rate) || 0;
        const disc = Number(field === 'discount_percent' ? value : updated.discount_percent) || 0;
        const gst = Number(field === 'gst_percent' ? value : updated.gst_percent) || 0;
        updated.amount = calculateRowAmount(qty, rate, disc, gst);
        return updated;
      })
    );
  };

  const removeItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subTotal = useMemo(() => {
    return lineItems.reduce((acc, it) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      const d = Number(it.discount_percent) || 0;
      return acc + q * r * (1 - d / 100);
    }, 0);
  }, [lineItems]);

  const gstAmount = useMemo(() => {
    return lineItems.reduce((acc, it) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      const d = Number(it.discount_percent) || 0;
      const g = Number(it.gst_percent) || 0;
      const base = q * r * (1 - d / 100);
      return acc + (base * g) / 100;
    }, 0);
  }, [lineItems]);

  const grandTotal = useMemo(() => subTotal + gstAmount, [subTotal, gstAmount]);

  // ── Terms Handlers ───────────────────────────────────────────────────────────

  const handleUpdateTerm = (index: number, value: string) => {
    setTerms((prev) => prev.map((t, idx) => (idx === index ? value : t)));
  };

  const handleRemoveTerm = (index: number) => {
    setTerms((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddTerm = () => {
    if (!newTermHeading.trim() && !newTermCondition.trim()) {
      toast.error('Please enter heading or condition');
      return;
    }
    const combined = newTermHeading.trim()
      ? `${newTermHeading.trim()}: ${newTermCondition.trim()}`
      : newTermCondition.trim();
    setTerms((prev) => [...prev, combined]);
    setNewTermHeading('');
    setNewTermCondition('');
    setShowAddTerm(false);
    toast.success('Term added');
  };

  // ── Reset Handler ────────────────────────────────────────────────────────────

  const handleReset = () => {
    const nextPo = generateNextPoNumber(existingPOs, variant);
    setPoNumber(nextPo);
    setPoDate(format(new Date(), 'yyyy-MM-dd'));
    setSupplierName('');
    setSupplierAddress('');
    setSupplierGstin('');
    setSupplierEmail('');
    setDeliveryDate(format(new Date(), 'yyyy-MM-dd'));
    setProjectName('Project Name');
    setDestinationAddress('');
    setIsEditingDestination(false);
    setSiteEngineerName('');
    setSiteEngineerPhone('');
    setSiteEngineerEmail('');
    setContractorName('');
    setContractorPhone('');
    setContractorEmail('');
    setSubContractorName('');
    setSubContractorPhone('');
    setSubContractorEmail('');
    setDescription('');
    setLineItems([]);
    setTerms([...DEFAULT_TERMS]);
    setSelectedIndent(null);
    setSelectedPoToRevise('');
    toast.info('Form reset');
  };

  // ── PDF Preview ──────────────────────────────────────────────────────────────

  const handlePreview = () => {
    if (!supplierName) {
      toast.error('Please select a supplier first');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    const pdfProps: POPdfProps = {
      poNumber: poNumber || '26-27/06',
      poDate: format(new Date(poDate || new Date()), 'dd/MM/yyyy'),
      deliveryDate: format(new Date(deliveryDate || new Date()), 'dd/MM/yyyy'),
      supplierName: supplierName,
      supplierAddress: supplierAddress || '',
      supplierGstin: supplierGstin || '',
      supplierContactPerson: '',
      supplierPhone: '',
      supplierEmail: supplierEmail || '',
      projectName: projectName || 'Pooja Construction Project',
      deliveryAddress: destinationAddress || 'Site Office',
      deliveryContactPerson: siteEngineerName || '',
      deliveryPhone: siteEngineerPhone || '',
      deliveryEmail: siteEngineerEmail || '',
      siteEngineerName: siteEngineerName || '',
      siteEngineerEmail: siteEngineerEmail || '',
      siteEngineerPhoneNo: siteEngineerPhone || '',
      items: lineItems.map((it, idx) => ({
        internalCode: it.indent_number || `ITEM-${idx + 1}`,
        quotationNo: it.quotation_number || '',
        product: it.product_name,
        paymentTerm: it.payment_terms || '',
        qty: Number(it.quantity) || 0,
        unit: it.uom || 'Nos',
        rate: Number(it.rate) || 0,
        gst: Number(it.gst_percent) || 0,
        discount: Number(it.discount_percent) || 0,
        amount: Number(it.amount) || 0,
      })),
      totalAmount: grandTotal,
      subtotal: subTotal,
      totalGst: gstAmount,
      companyName: 'POOJA CONSTRUCTION',
      companyAddress: 'Office No. 402, Trade Centre, Pune – 411001',
      companyPhone: '+91 20 2567 8900',
      companyEmail: 'info@poojaconstruction.com',
      companyGstin: '27AABCP1234F1Z5',
      companyPan: 'AABCP1234F',
      companyContactPerson: 'Procurement Head',
      terms: terms.map((t, idx) => ({ num: String(idx + 1), text: t })),
      logo: '/logo.png',
    };

    setPreviewData(pdfProps);
    setShowPreview(true);
  };

  // ── Save & Send PO ───────────────────────────────────────────────────────────

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!supplierName.trim()) {
      toast.error('Please select a supplier');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('At least one item is required in the Purchase Order');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        po_number: poNumber,
        po_date: poDate,
        indent_id: selectedIndent?.id || null,
        indent_number: selectedIndent?.indent_number || (lineItems[0]?.indent_number ?? ''),
        project_id: selectedIndent?.project_id || (isContract && getActiveProject()?.id != null ? String(getActiveProject()!.id) : projects[0]?.id ? String(projects[0].id) : '1'),
        project_name: projectName || 'Pooja Project',
        vendor_name: supplierName,
        vendor_address: supplierAddress,
        vendor_gstin: supplierGstin,
        vendor_email: supplierEmail,
        delivery_date: deliveryDate || null,
        destination_address: destinationAddress,
        site_engineer_name: siteEngineerName,
        site_engineer_phone: siteEngineerPhone,
        site_engineer_email: siteEngineerEmail,
        contractor_name: contractorName,
        contractor_phone: contractorPhone,
        contractor_email: contractorEmail,
        sub_contractor_name: subContractorName,
        sub_contractor_phone: subContractorPhone,
        sub_contractor_email: subContractorEmail,
        remarks: description,
        sub_total: subTotal,
        gst_amount: gstAmount,
        grand_total: grandTotal,
        terms: terms,
        line_items: lineItems.map((it) => ({
          indent_number: it.indent_number,
          indent_item_id: it.indent_item_id || null,
          quotation_number: it.quotation_number || null,
          product_name: it.product_name,
          quantity: Number(it.quantity) || 1,
          uom: it.uom || 'Nos',
          rate: Number(it.rate) || 0,
          gst_percent: Number(it.gst_percent) || 0,
          discount_percent: Number(it.discount_percent) || 0,
          amount: it.amount,
          payment_terms: it.payment_terms || null,
        })),
      };

      const res = editPo?.id ? await pmsApi.patch(`/pos/${editPo.id}`, payload) : await pmsApi.post('/pos', payload);

      if (res?.error && !res?.success) {
        toast.error(res.error || 'Failed to create PO');
        return;
      }

      // Contracts feed Sub Contractor Billing: register as PO master + PO products (rates) under the contract number
      if (isContract) {
        upsertExternalPurchaseOrder({
          po_number: poNumber, poDate, vendor_name: supplierName, sub_contractor_name: supplierName,
          sub_contractor_phone: subContractorPhone, sub_contractor_email: supplierEmail,
          total_po_amount: grandTotal, remarks: description || 'Contract',
        });
        saveProductsForPONumber(poNumber, lineItems.map((it, i) => ({
          sn: i + 1, internalCode: it.indent_number || `CON-${i + 1}`, product: it.product_name,
          qty: Number(it.quantity) || 0, unit: it.uom || 'Nos', rate: Number(it.rate) || 0,
          gst: Number(it.gst_percent) || 0, discount: Number(it.discount_percent) || 0,
        })));
      }

      // If supplier has email, attempt to email the PO
      if (isContract || editPo) {
        toast.success(`${isContract ? 'Contract' : 'PO'} ${poNumber} ${editPo ? 'updated' : 'created'} successfully!`);
      } else if (supplierEmail && supplierEmail.includes('@') && emailApi?.sendEmail) {
        try {
          const emailSubject = `Purchase Order - ${poNumber}`;
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1e293b;">POOJA CONSTRUCTION</h2>
              <p>Dear ${supplierName},</p>
              <p>Please find details of Purchase Order <strong>${poNumber}</strong> below:</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p><strong>PO Number:</strong> ${poNumber}</p>
                <p><strong>PO Date:</strong> ${poDate}</p>
                <p><strong>Delivery Date:</strong> ${deliveryDate}</p>
                <p><strong>Grand Total:</strong> ₹${grandTotal.toFixed(2)}</p>
              </div>
              <p>Site Incharge: ${siteEngineerName} (${siteEngineerPhone})</p>
            </div>
          `;
          await emailApi.sendEmail({
            to: supplierEmail.trim(),
            subject: emailSubject,
            html: emailHtml,
          });
          toast.success(`PO saved and sent to ${supplierEmail.trim()}`);
        } catch {
          toast.success(`Purchase Order ${poNumber} created successfully!`);
        }
      } else {
        toast.success(`Purchase Order ${poNumber} created successfully!`);
      }

      // Refresh list & reset
      await loadData();
      if (!editPo) handleReset();
      onCreated?.();
    } catch (err: any) {
      toast.error(err?.message || 'Error creating Purchase Order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4fd] p-2 sm:p-4 md:p-6 flex flex-col items-center justify-start text-slate-800">
      {/* ── Top Tabs: Create | Revise ─────────────────────────────────────── */}
      {!isContract && <div className="w-full max-w-6xl">
        <Tabs
          value={mode}
          onValueChange={(v) => handleModeChange(v as 'create' | 'revise')}
          className="w-full"
        >
          <TabsList className="h-10 w-full rounded-t-md bg-[#e7edf7] border-b border-slate-200 p-1">
            <TabsTrigger
              value="create"
              className="flex-1 font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-600"
            >
              Create
            </TabsTrigger>
            <TabsTrigger
              value="revise"
              className="flex-1 font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-600"
            >
              Revise
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>}

      {/* ── Main Form White Card Container ───────────────────────────────── */}
      <div className="w-full max-w-6xl bg-white shadow-md rounded-b-md p-4 sm:p-6 space-y-4 border border-slate-200/80">
        {/* Company Header Box */}
        <div className="flex flex-col items-center justify-center gap-1 bg-[#eff6ff] p-3 sm:p-4 rounded-md text-center border border-blue-100/80 w-full">
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-slate-900">
            POOJA CONSTRUCTION
          </h1>
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm text-slate-500 leading-normal">
              Address: Office No. 402, Trade Centre, Pune – 411001
            </p>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Phone No: +91 20 2567 8900
            </p>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* Section Title */}
        <h2 className="text-center font-bold text-lg text-slate-800">{isContract ? 'Contract' : 'Purchase Order'}</h2>

        <hr className="border-slate-200" />

        {/* ── Header Form Fields ─────────────────────────────────────────── */}
        <div className="space-y-3.5">
          {/* Row 1: PO Number & PO Date */}
          {!isContract && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">PO Number</Label>
              {mode === 'create' ? (
                <Input
                  className="h-9 bg-[#f8fafc] text-slate-800 font-mono text-sm border-slate-200"
                  readOnly
                  placeholder="Enter PO number"
                  value={poNumber}
                />
              ) : (
                <Select
                  value={selectedPoToRevise}
                  onValueChange={(val) => {
                    setSelectedPoToRevise(val);
                    const found = existingPOs.find(
                      (p) => (p.po_number || p.poNumber) === val
                    );
                    if (found) loadPoForRevision(found);
                  }}
                >
                  <SelectTrigger className="h-9 bg-white border-slate-200">
                    <SelectValue placeholder="Select PO to Revise" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingPOs.length === 0 ? (
                      <div className="p-2 text-xs text-slate-400 text-center">
                        No previous POs
                      </div>
                    ) : (
                      existingPOs.map((p, idx) => {
                        const no = p.po_number || p.poNumber;
                        return (
                          <SelectItem key={idx} value={no}>
                            {no} — {p.vendor_name || 'Vendor'} ({p.project_name || 'Project'})
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">PO Date</Label>
              <Input
                type="date"
                className="h-9 bg-[#f8fafc] border-slate-200 text-slate-700"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
              />
            </div>
          </div>}

          {/* Row 2: Supplier Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Supplier Name</Label>
            <Select value={supplierName} onValueChange={handleSelectSupplier}>
              <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-700">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {availableSuppliers.map((s, idx) => (
                  <SelectItem key={idx} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Supplier Address, GSTIN, Company Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Supplier Address</Label>
              <Input
                className="h-9 bg-[#f8fafc] border-slate-200 text-slate-700 text-sm"
                placeholder="Enter supplier address"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">GSTIN</Label>
              <Input
                className="h-9 bg-[#f8fafc] border-slate-200 text-slate-700 text-sm font-mono"
                placeholder="Enter GSTIN"
                value={supplierGstin}
                onChange={(e) => setSupplierGstin(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Company Email</Label>
              <Input
                type="email"
                className="h-9 bg-[#f8fafc] border-slate-200 text-slate-700 text-sm"
                placeholder="Enter company email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Delivery Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Delivery Date</Label>
              <Input
                type="date"
                className="h-9 bg-[#f8fafc] border-slate-200 text-slate-700"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* ── 5-Card Commercial Details Grid ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Project Name */}
          <Card className="p-0 gap-0 shadow-xs rounded-[3px] border border-slate-200">
            <CardHeader className="bg-[#f1f5f9] px-4 py-1.5 border-b border-slate-200">
              <CardTitle className="text-center truncate text-[12px] font-semibold text-slate-700">
                Project Name
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-sm flex items-center justify-center min-h-[75px]">
              <p className="text-[14px] font-bold text-center leading-tight text-slate-800">
                {projectName || 'Project Name'}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Delivery Address */}
          <Card className="p-0 gap-0 shadow-xs rounded-[3px] border border-slate-200">
            <CardHeader className="bg-[#f1f5f9] px-4 py-1.5 border-b border-slate-200">
              <CardTitle className="text-center flex items-center justify-between text-[12px] font-semibold text-slate-700">
                <span>Delivery Address</span>
                {supplierName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingDestination(!isEditingDestination);
                      if (isEditingDestination) {
                        toast.success('Delivery address updated');
                      }
                    }}
                    className="h-5 w-5 p-0 hover:bg-slate-200"
                  >
                    {isEditingDestination ? (
                      <Save size={12} className="text-green-600" />
                    ) : (
                      <Pencil size={12} className="text-slate-600" />
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-[12px] flex items-center justify-center min-h-[75px]">
              {isEditingDestination ? (
                <Input
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  className="h-7 text-xs bg-white"
                  placeholder="Enter delivery address"
                  autoFocus
                />
              ) : (
                <p
                  className={cn(
                    'text-center leading-tight text-xs',
                    destinationAddress ? 'text-slate-700 font-medium' : 'text-slate-400'
                  )}
                >
                  {destinationAddress || 'Select Supplier'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Site Incharge Details * */}
          <Card className="p-0 gap-0 shadow-xs rounded-[3px] border border-slate-200">
            <CardHeader className="bg-[#f1f5f9] px-4 py-1.5 border-b border-slate-200">
              <CardTitle className="text-center flex items-center justify-between text-[12px] font-semibold text-slate-700">
                <span>
                  Site Incharge Details <span className="text-red-500">*</span>
                </span>
                <Save
                  size={12}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                  onClick={() => toast.success('Site Incharge details saved')}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  NAME <span className="text-red-500">*</span>
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Name"
                  value={siteEngineerName}
                  onChange={(e) => setSiteEngineerName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  PHONE <span className="text-red-500">*</span>
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Phone"
                  value={siteEngineerPhone}
                  onChange={(e) => setSiteEngineerPhone(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  EMAIL <span className="text-red-500">*</span>
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Email"
                  value={siteEngineerEmail}
                  onChange={(e) => setSiteEngineerEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Contractor Details */}
          <Card className="p-0 gap-0 shadow-xs rounded-[3px] border border-slate-200">
            <CardHeader className="bg-[#f1f5f9] px-4 py-1.5 border-b border-slate-200">
              <CardTitle className="text-center truncate text-[12px] font-semibold text-slate-700">
                Contractor Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  NAME
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Contractor"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  PHONE
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Phone"
                  value={contractorPhone}
                  onChange={(e) => setContractorPhone(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  EMAIL
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Email"
                  value={contractorEmail}
                  onChange={(e) => setContractorEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Sub Contractor Details */}
          <Card className="p-0 gap-0 shadow-xs rounded-[3px] border border-slate-200">
            <CardHeader className="bg-[#f1f5f9] px-4 py-1.5 border-b border-slate-200">
              <CardTitle className="text-center truncate text-[12px] font-semibold text-slate-700">
                Sub Contractor Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  NAME
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Sub Contractor"
                  value={subContractorName}
                  onChange={(e) => setSubContractorName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  PHONE
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Phone"
                  value={subContractorPhone}
                  onChange={(e) => setSubContractorPhone(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-12 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                  EMAIL
                </span>
                <Input
                  className="h-7 text-[11px] bg-[#f8fafc] border-slate-200"
                  placeholder="Enter Email"
                  value={subContractorEmail}
                  onChange={(e) => setSubContractorEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <hr className="border-slate-200" />

        {/* ── Description ────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Description</Label>
          <Textarea
            placeholder="Enter message"
            className="resize-y min-h-[60px] bg-[#f8fafc] border-slate-200 text-sm text-slate-700"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <hr className="border-slate-200" />

        {/* ── Line Items Table ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="rounded-[3px] w-full overflow-x-auto border border-slate-200">
            <Table className="min-w-[650px]">
              <TableHeader className="bg-[#f1f5f9]">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-semibold text-slate-700">
                    S/N
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">
                    Internal Code
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">
                    Product
                  </TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold text-slate-700">
                    Qty
                  </TableHead>
                  <TableHead className="w-20 text-center text-xs font-semibold text-slate-700">
                    Unit
                  </TableHead>
                  <TableHead className="w-28 text-center text-xs font-semibold text-slate-700">
                    Rate
                  </TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold text-slate-700">
                    GST (%)
                  </TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold text-slate-700">
                    Discount (%)
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    Amount
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-6 text-xs text-slate-400 italic"
                    >
                      {supplierName
                        ? 'No line items for this supplier. Select another supplier.'
                        : 'Select a supplier above to populate items.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, index) => (
                    <TableRow key={index} className="hover:bg-slate-50/60">
                      <TableCell className="text-center text-xs text-slate-600">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700 font-medium">
                        {item.indent_number || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-800 font-medium">
                        {item.product_name || 'No Product'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          className="h-8 w-20 text-center bg-[#f8fafc] text-xs mx-auto border-slate-200"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-600">
                        {item.uom || 'Nos'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          className="h-8 w-24 text-center bg-[#f8fafc] text-xs mx-auto border-slate-200"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(index, 'rate', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-16 text-center bg-white text-xs border-slate-200"
                            value={item.gst_percent}
                            onChange={(e) =>
                              updateItem(index, 'gst_percent', parseFloat(e.target.value) || 0)
                            }
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-16 text-center bg-white text-xs border-slate-200"
                            value={item.discount_percent}
                            onChange={(e) =>
                              updateItem(
                                index,
                                'discount_percent',
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-800">
                        ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Total Calculation Box */}
          <div className="flex justify-end p-2 sm:p-4">
            <div className="w-full sm:w-80 rounded-[3px] bg-[#f1f5f9] border border-slate-200 text-xs">
              <p className="flex px-6 py-2.5 justify-between">
                <span className="text-slate-600">Total:</span>
                <span className="font-semibold text-slate-800">
                  {subTotal.toFixed(2)}
                </span>
              </p>
              <hr className="border-slate-200" />
              <p className="flex px-6 py-2.5 justify-between">
                <span className="text-slate-600">GST Amount:</span>
                <span className="font-semibold text-slate-800">
                  {gstAmount.toFixed(2)}
                </span>
              </p>
              <hr className="border-slate-200" />
              <p className="flex px-6 py-2.5 justify-between font-bold text-slate-900">
                <span>Grand Total:</span>
                <span>{grandTotal.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* ── Terms Section (THE ABOVE) ──────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            THE ABOVE
          </p>
          <div className="space-y-1.5">
            {terms.map((term, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-slate-400 font-medium text-right shrink-0">
                  {index + 1}.
                </span>
                <Input
                  className="h-8 text-xs bg-[#f8fafc] border-slate-200 flex-1 text-slate-700"
                  value={term}
                  onChange={(e) => handleUpdateTerm(index, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                  onClick={() => handleRemoveTerm(index)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              className="w-48 bg-[#f8fafc] border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100"
              onClick={() => setShowAddTerm(true)}
            >
              Add Term
            </Button>
          </div>
        </div>

        <hr className="border-slate-200" />
      </div>

      {/* ── Action Buttons Bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 w-full max-w-6xl bg-white shadow-md rounded-md border border-slate-200 mt-4 mb-3">
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
          onClick={handlePreview}
          disabled={!supplierName || lineItems.length === 0}
        >
          <Eye size={16} className="mr-2 text-slate-600" />
          Preview
        </Button>
        <Button
          type="button"
          className="bg-[#3b49df] hover:bg-[#2b37be] text-white text-sm font-medium"
          onClick={handleSubmit}
          disabled={submitting || !supplierName || lineItems.length === 0}
        >
          {submitting && <Loader2 size={16} className="mr-2 animate-spin text-white" />}
          Save And Send PO
        </Button>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="text-center py-2 text-sm font-semibold text-blue-600">
        Powered By Botivate
      </div>

      {/* ── Add Term Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showAddTerm} onOpenChange={setShowAddTerm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Term</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a new purchase order term or condition
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Heading</Label>
              <Input
                className="h-9 text-xs"
                placeholder="e.g. Payment Terms"
                value={newTermHeading}
                onChange={(e) => setNewTermHeading(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Condition</Label>
              <Textarea
                className="text-xs resize-y min-h-[70px]"
                placeholder="e.g. Payment strictly within 30 days of goods receipt and inspection on site."
                value={newTermCondition}
                onChange={(e) => setNewTermCondition(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddTerm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#3b49df] hover:bg-[#2b37be] text-white"
              onClick={handleAddTerm}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PO Preview Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-800">
              PO Preview — {poNumber}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Purchase order PDF preview
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[calc(95vh-70px)]">
            {previewData && (
              <PDFViewer
                width="100%"
                height="100%"
                showToolbar={true}
                style={{ border: 'none' }}
              >
                <POPdf {...previewData} />
              </PDFViewer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
