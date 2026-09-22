/**
 * In-memory Mock Data Store for the Repair Module
 * Interconnected with mockAssetStore and mockMaintenanceStore.
 */
import { mockAssetStore } from './mockAssetStore';
import { mockMaintenanceStore } from './mockMaintenanceStore';

export interface Vendor {
  id: string;
  name: string;
  type: string;
  gstNumber?: string;
  email?: string;
  address?: string;
  mobileNumber?: string;
  contactName?: string;
}

export interface PartAndVendor {
  id: string;
  partName: string;
  partCode: string;
  machineType: string;
  vendorName: string;
  unitPrice: number;
  stockQty: number;
  minStockQty: number;
  unit: string;
  description?: string;
}

export interface RBIndent {
  id: string;
  indentNumber: string;
  machineName: string;
  machineSerialNo: string;
  doerName: string;
  department: string;
  machinePartName: string;
  problem: string;
  priority: 'High' | 'Medium' | 'Low';
  expectedDeliveryDays: number;
  location: string;
  taskStatus: 'Pending' | 'Assigned' | 'Sent for Repair' | 'Store In' | 'Completed' | 'Payment Done';
  image?: string;
  remarks: string;
  soundOfMachine?: string;
  temperature?: string;
  maintenanceCost?: number;
  approvalStatus?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  vendorName?: string;
  vendorPhone?: string;
  techAssignment?: {
    technicianId: string;
    technicianName: string;
    assignedDate: string;
    workNotes?: string;
  };
  paymentDetails?: {
    finalPaymentAmount: number;
    paymentBatchId?: string;
    paidAt?: string;
  };
  storeInDetails?: {
    toBePaidAmount: number;
    receivedAt?: string;
  };
}

export interface StoreinItem {
  id: string;
  indentId: string;
  indentNumber: string;
  machineName: string;
  machinePartName: string;
  vendorName: string;
  billNo: string;
  totalBillAmount: number;
  toBePaidAmount: number;
  receivedAt: string;
  receivedBy: string;
  inspectedBy: string;
  inspectionStatus: 'Pass' | 'Fail' | 'Pending';
  status: 'Pending Verification' | 'Approved' | 'Rejected';
}

export interface SentmachineItem {
  id: string;
  indentId: string;
  indentNumber: string;
  machineName: string;
  vendorName: string;
  transporterName: string;
  transportCharges: number;
  weighmentSlipNo: string;
  sentAt: string;
  expectedReturnDate: string;
  status: 'In Transit' | 'At Vendor' | 'Returned';
}

export interface PaymentItem {
  id: string;
  indentId: string;
  indentNumber: string;
  machineName: string;
  vendorName: string;
  billNo: string;
  totalBillAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: 'Online Transfer' | 'Cheque' | 'Cash';
  paidAt: string;
  status: 'Fully Paid' | 'Partial' | 'Pending Approval';
}

export interface AMCItem {
  id: string;
  contractNumber: string;
  machineName: string;
  serialNumber: string;
  vendorName: string;
  vendorContact: string;
  startDate: string;
  endDate: string;
  annualCost: number;
  visitsPerYear: number;
  completedVisits: number;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  scope: string;
}

class MockRepairStore {
  private indents: RBIndent[] = [
    {
      id: 'ind-1',
      indentNumber: 'REP-2026-001',
      machineName: 'Packaging Line Robot',
      machineSerialNo: 'SR2025000007',
      doerName: 'Amit Singh',
      department: 'Packaging',
      machinePartName: 'Gripper Pneumatic Actuator Valve',
      problem: 'Actuator solenoid coil burnt out causing arm to freeze mid-cycle',
      priority: 'High',
      expectedDeliveryDays: 3,
      location: 'Packaging Line 3',
      taskStatus: 'Sent for Repair',
      remarks: 'Sent to Apex Automation Services for urgent rewinding and testing',
      maintenanceCost: 14500,
      approvalStatus: 'Approved',
      approvedAt: '2026-09-15',
      vendorName: 'Apex Automation Services',
      vendorPhone: '9822334455',
      createdAt: '2026-09-14',
      updatedAt: '2026-09-16',
    },
    {
      id: 'ind-2',
      indentNumber: 'REP-2026-002',
      machineName: 'CNC Milling Machine 5-Axis',
      machineSerialNo: 'SR2025000003',
      doerName: 'Vikram Sharma',
      department: 'Production',
      machinePartName: 'Coolant Pump 0.5HP',
      problem: 'Coolant pump motor seized due to chip ingress',
      priority: 'Medium',
      expectedDeliveryDays: 2,
      location: 'Shop Floor A',
      taskStatus: 'Completed',
      remarks: 'Pump impeller cleaned and new bearing installed in-house',
      maintenanceCost: 4500,
      approvalStatus: 'Approved',
      approvedAt: '2026-09-11',
      vendorName: 'In-House Maintenance',
      createdAt: '2026-09-10',
      updatedAt: '2026-09-11',
    },
    {
      id: 'ind-3',
      indentNumber: 'REP-2026-003',
      machineName: 'Forklift Electric 3T',
      machineSerialNo: 'SR2025000006',
      doerName: 'Sunil Verma',
      department: 'Warehouse',
      machinePartName: 'Hydraulic Lift Cylinder Seal',
      problem: 'Minor hydraulic oil seepage from secondary piston rod',
      priority: 'Low',
      expectedDeliveryDays: 5,
      location: 'Warehouse A',
      taskStatus: 'Store In',
      remarks: 'Seal kit received from Toyota Spares, ready for weekend fitting',
      maintenanceCost: 3200,
      approvalStatus: 'Approved',
      approvedAt: '2026-09-14',
      vendorName: 'Toyota Material Handling',
      vendorPhone: '9877112233',
      createdAt: '2026-09-12',
      updatedAt: '2026-09-16',
    },
  ];

  private partsAndVendors: PartAndVendor[] = [
    {
      id: 'pv-1',
      partName: 'Spindle High-Speed Bearing 7014',
      partCode: 'PRT-SP-7014',
      machineType: 'CNC Milling',
      vendorName: 'NSK Precision India',
      unitPrice: 18500,
      stockQty: 4,
      minStockQty: 2,
      unit: 'Set',
      description: 'Angular contact ball bearing pair for spindle',
    },
    {
      id: 'pv-2',
      partName: 'Coolant Pump Motor 0.5HP',
      partCode: 'PRT-CP-050',
      machineType: 'CNC Milling / Lathe',
      vendorName: 'Apex Automation Services',
      unitPrice: 6200,
      stockQty: 2,
      minStockQty: 1,
      unit: 'Pcs',
      description: 'Submersible coolant pump 415V 3-phase',
    },
    {
      id: 'pv-3',
      partName: 'Hydraulic Cylinder Seal Kit 100T',
      partCode: 'PRT-HC-100',
      machineType: 'Hydraulic Press',
      vendorName: 'Parker Hannifin Seals',
      unitPrice: 4800,
      stockQty: 5,
      minStockQty: 2,
      unit: 'Kit',
      description: 'Polyurethane piston & rod seal kit',
    },
    {
      id: 'pv-4',
      partName: 'Air Filter Element 500L',
      partCode: 'PRT-AF-011',
      machineType: 'Air Compressor',
      vendorName: 'Atlas Copco Spares',
      unitPrice: 950,
      stockQty: 12,
      minStockQty: 4,
      unit: 'Pcs',
      description: 'Heavy-duty air intake filter cartridge',
    },
    {
      id: 'pv-5',
      partName: 'Forklift Traction Battery Cell 2V',
      partCode: 'PRT-BT-002',
      machineType: 'Forklift Electric',
      vendorName: 'Exide Industrial',
      unitPrice: 8500,
      stockQty: 6,
      minStockQty: 2,
      unit: 'Cell',
      description: 'Lead-acid traction battery cell 500Ah',
    },
  ];

  private vendors: Vendor[] = [
    {
      id: 'v-1',
      name: 'Apex Automation Services',
      type: 'Outhouse Repair',
      gstNumber: '27AAACA1234A1Z5',
      email: 'service@apexautomation.in',
      address: 'Plot 45, MIDC Industrial Area, Pune',
      mobileNumber: '9822334455',
      contactName: 'Nitin Kulkarni',
    },
    {
      id: 'v-2',
      name: 'Parker Hannifin Seals',
      type: 'Spares Supplier',
      gstNumber: '27BBBCB5678B1Z2',
      email: 'orders@parkerseals.com',
      address: 'GIDC Estate, Ahmedabad',
      mobileNumber: '9811223344',
      contactName: 'Anil Desai',
    },
    {
      id: 'v-3',
      name: 'Toyota Material Handling',
      type: 'Authorized OEM',
      gstNumber: '29CCCC9012C1Z8',
      email: 'support@toyotamaterial.in',
      address: 'Whitefield Road, Bengaluru',
      mobileNumber: '9877112233',
      contactName: 'Sanjay Rao',
    },
  ];

  private storeinItems: StoreinItem[] = [
    {
      id: 'st-1',
      indentId: 'ind-3',
      indentNumber: 'REP-2026-003',
      machineName: 'Forklift Electric 3T',
      machinePartName: 'Hydraulic Lift Cylinder Seal',
      vendorName: 'Toyota Material Handling',
      billNo: 'INV-TMH-9821',
      totalBillAmount: 3200,
      toBePaidAmount: 3200,
      receivedAt: '2026-09-16',
      receivedBy: 'Ganesh Storekeeper',
      inspectedBy: 'Sunil Verma',
      inspectionStatus: 'Pass',
      status: 'Approved',
    },
    {
      id: 'st-2',
      indentId: 'ind-2',
      indentNumber: 'REP-2026-002',
      machineName: 'CNC Milling Machine 5-Axis',
      machinePartName: 'Coolant Pump 0.5HP',
      vendorName: 'In-House Maintenance',
      billNo: 'INHOUSE-091',
      totalBillAmount: 4500,
      toBePaidAmount: 0,
      receivedAt: '2026-09-11',
      receivedBy: 'Ganesh Storekeeper',
      inspectedBy: 'Vikram Sharma',
      inspectionStatus: 'Pass',
      status: 'Approved',
    },
  ];

  private sentMachines: SentmachineItem[] = [
    {
      id: 'sm-1',
      indentId: 'ind-1',
      indentNumber: 'REP-2026-001',
      machineName: 'Packaging Line Robot Gripper',
      vendorName: 'Apex Automation Services',
      transporterName: 'Express Cargo Logistics',
      transportCharges: 850,
      weighmentSlipNo: 'WS-2026-889',
      sentAt: '2026-09-15',
      expectedReturnDate: '2026-09-20',
      status: 'At Vendor',
    },
  ];

  private payments: PaymentItem[] = [
    {
      id: 'pay-1',
      indentId: 'ind-2',
      indentNumber: 'REP-2026-002',
      machineName: 'CNC Milling Machine 5-Axis',
      vendorName: 'Apex Automation Services',
      billNo: 'INV-APX-4412',
      totalBillAmount: 4500,
      paidAmount: 4500,
      balanceAmount: 0,
      paymentMode: 'Online Transfer',
      paidAt: '2026-09-12',
      status: 'Fully Paid',
    },
  ];

  private amcList: AMCItem[] = [
    {
      id: 'amc-1',
      contractNumber: 'AMC-2026-001',
      machineName: 'CNC Milling Machine 5-Axis',
      serialNumber: 'SR2025000003',
      vendorName: 'Haas Factory Outlet',
      vendorContact: '9845012345',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      annualCost: 85000,
      visitsPerYear: 4,
      completedVisits: 2,
      status: 'Active',
      scope: 'Spindle calibration, axis alignment, and controller software diagnostics',
    },
    {
      id: 'amc-2',
      contractNumber: 'AMC-2026-002',
      machineName: 'Air Compressor 500L',
      serialNumber: 'SR2025000005',
      vendorName: 'Atlas Copco India',
      vendorContact: '9822339900',
      startDate: '2026-03-01',
      endDate: '2027-02-28',
      annualCost: 28000,
      visitsPerYear: 6,
      completedVisits: 3,
      status: 'Active',
      scope: 'Filter replacement, oil change, pressure valve testing',
    },
    {
      id: 'amc-3',
      contractNumber: 'AMC-2026-003',
      machineName: 'Diesel Generator 250kVA',
      serialNumber: 'SR2025000008',
      vendorName: 'Cummins Power Care',
      vendorContact: '9811228844',
      startDate: '2025-10-01',
      endDate: '2026-09-30',
      annualCost: 45000,
      visitsPerYear: 4,
      completedVisits: 3,
      status: 'Expiring Soon',
      scope: 'Full engine tune-up, radiator descaling, fuel pump calibration',
    },
  ];

  // --- Indents ---
  getIndents(): RBIndent[] {
    return this.indents;
  }

  getIndentById(id: string): RBIndent | undefined {
    return this.indents.find((i) => i.id === id);
  }

  createIndent(data: Partial<RBIndent>): RBIndent {
    const id = `ind-${Date.now()}`;
    const newIndent: RBIndent = {
      id,
      indentNumber: `REP-${new Date().getFullYear()}-${String(this.indents.length + 1).padStart(3, '0')}`,
      machineName: data.machineName || 'Machine',
      machineSerialNo: data.machineSerialNo || '',
      doerName: data.doerName || 'Technician',
      department: data.department || 'Production',
      machinePartName: data.machinePartName || 'General Repair',
      problem: data.problem || '',
      priority: data.priority || 'Medium',
      expectedDeliveryDays: data.expectedDeliveryDays || 3,
      location: data.location || '',
      taskStatus: 'Pending',
      remarks: data.remarks || '',
      maintenanceCost: data.maintenanceCost || 0,
      approvalStatus: 'Pending',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      vendorName: data.vendorName || '',
    };
    this.indents = [newIndent, ...this.indents];

    // Interconnect: Set Asset and Machine to 'Under Repair'
    const asset = mockAssetStore.getAssets().find((a) => a.serialNo === newIndent.machineSerialNo || a.productName === newIndent.machineName);
    if (asset) {
      mockAssetStore.updateAsset(asset.id, { status: 'Under Repair' });
    }
    const machine = mockMaintenanceStore.getMachines().find((m) => m.serialNumber === newIndent.machineSerialNo || m.name === newIndent.machineName);
    if (machine) {
      mockMaintenanceStore.updateMachine(machine.id, { status: 'UNDER_MAINTENANCE' });
    }

    return newIndent;
  }

  updateIndent(id: string, data: Partial<RBIndent>): RBIndent | undefined {
    let updated: RBIndent | undefined;
    this.indents = this.indents.map((i) => {
      if (i.id !== id) return i;
      updated = { ...i, ...data, updatedAt: new Date().toISOString().slice(0, 10) };
      return updated;
    });

    if (updated && (updated.taskStatus === 'Completed' || updated.taskStatus === 'Payment Done')) {
      // Interconnect: Complete repair on Asset!
      const asset = mockAssetStore.getAssets().find((a) => a.serialNo === updated?.machineSerialNo || a.productName === updated?.machineName);
      if (asset) {
        const cost = updated.maintenanceCost || 0;
        const partNames = updated.machinePartName ? [updated.machinePartName] : [];
        const existingParts = asset.partNames || [];
        const newPartList = Array.from(new Set([...existingParts, ...partNames]));

        mockAssetStore.updateAsset(asset.id, {
          status: 'Active',
          repairCount: (asset.repairCount || 0) + 1,
          lastRepairDate: new Date().toISOString().slice(0, 10),
          repairCost: cost,
          totalRepairCost: (asset.totalRepairCost || 0) + cost,
          partChanged: newPartList.length > 0 ? 'Yes' : 'No',
          partNames: newPartList,
        });
      }

      const machine = mockMaintenanceStore.getMachines().find((m) => m.serialNumber === updated?.machineSerialNo || m.name === updated?.machineName);
      if (machine) {
        mockMaintenanceStore.updateMachine(machine.id, { status: 'OPERATIONAL' });
      }
    }

    return updated;
  }

  // --- Parts & Vendors ---
  getPartsAndVendors(): PartAndVendor[] {
    return this.partsAndVendors;
  }

  createPart(data: Partial<PartAndVendor>): PartAndVendor {
    const newPart: PartAndVendor = {
      id: `pv-${Date.now()}`,
      partName: data.partName || 'Spare Part',
      partCode: data.partCode || `PRT-${Date.now().toString().slice(-4)}`,
      machineType: data.machineType || 'General',
      vendorName: data.vendorName || 'General Supplier',
      unitPrice: data.unitPrice || 0,
      stockQty: data.stockQty || 0,
      minStockQty: data.minStockQty || 1,
      unit: data.unit || 'Pcs',
      description: data.description || '',
    };
    this.partsAndVendors = [newPart, ...this.partsAndVendors];
    return newPart;
  }

  getVendors(): Vendor[] {
    return this.vendors;
  }

  createVendor(data: Partial<Vendor>): Vendor {
    const newVendor: Vendor = {
      id: `v-${Date.now()}`,
      name: data.name || 'Vendor',
      type: data.type || 'Spares Supplier',
      gstNumber: data.gstNumber || '',
      email: data.email || '',
      address: data.address || '',
      mobileNumber: data.mobileNumber || '',
      contactName: data.contactName || '',
    };
    this.vendors = [newVendor, ...this.vendors];
    return newVendor;
  }

  addVendor(data: Partial<Vendor>): Vendor {
    return this.createVendor(data);
  }

  // --- Store-In ---
  getStoreinItems(): StoreinItem[] {
    return this.storeinItems;
  }

  createStoreinItem(data: Partial<StoreinItem>): StoreinItem {
    const newItem: StoreinItem = {
      id: `st-${Date.now()}`,
      indentId: data.indentId || '',
      indentNumber: data.indentNumber || '',
      machineName: data.machineName || '',
      machinePartName: data.machinePartName || '',
      vendorName: data.vendorName || '',
      billNo: data.billNo || '',
      totalBillAmount: data.totalBillAmount || 0,
      toBePaidAmount: data.toBePaidAmount || data.totalBillAmount || 0,
      receivedAt: data.receivedAt || new Date().toISOString().slice(0, 10),
      receivedBy: data.receivedBy || 'Storekeeper',
      inspectedBy: data.inspectedBy || 'Technician',
      inspectionStatus: data.inspectionStatus || 'Pass',
      status: 'Approved',
    };
    this.storeinItems = [newItem, ...this.storeinItems];
    return newItem;
  }

  // --- Sent Machines ---
  getSentMachines(): SentmachineItem[] {
    return this.sentMachines;
  }

  createSentMachine(data: Partial<SentmachineItem>): SentmachineItem {
    const newItem: SentmachineItem = {
      id: `sm-${Date.now()}`,
      indentId: data.indentId || '',
      indentNumber: data.indentNumber || '',
      machineName: data.machineName || '',
      vendorName: data.vendorName || '',
      transporterName: data.transporterName || 'Transporter',
      transportCharges: data.transportCharges || 0,
      weighmentSlipNo: data.weighmentSlipNo || '',
      sentAt: data.sentAt || new Date().toISOString().slice(0, 10),
      expectedReturnDate: data.expectedReturnDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'In Transit',
    };
    this.sentMachines = [newItem, ...this.sentMachines];
    return newItem;
  }

  // --- Payments ---
  getPayments(): PaymentItem[] {
    return this.payments;
  }

  createPayment(data: Partial<PaymentItem>): PaymentItem {
    const newItem: PaymentItem = {
      id: `pay-${Date.now()}`,
      indentId: data.indentId || '',
      indentNumber: data.indentNumber || '',
      machineName: data.machineName || '',
      vendorName: data.vendorName || '',
      billNo: data.billNo || '',
      totalBillAmount: data.totalBillAmount || 0,
      paidAmount: data.paidAmount || 0,
      balanceAmount: (data.totalBillAmount || 0) - (data.paidAmount || 0),
      paymentMode: data.paymentMode || 'Online Transfer',
      paidAt: data.paidAt || new Date().toISOString().slice(0, 10),
      status: 'Fully Paid',
    };
    this.payments = [newItem, ...this.payments];
    return newItem;
  }

  // --- AMC ---
  getAMCs(): AMCItem[] {
    return this.amcList;
  }

  createAMC(data: Partial<AMCItem>): AMCItem {
    const newItem: AMCItem = {
      id: `amc-${Date.now()}`,
      contractNumber: data.contractNumber || `AMC-${new Date().getFullYear()}-${String(this.amcList.length + 1).padStart(3, '0')}`,
      machineName: data.machineName || '',
      serialNumber: data.serialNumber || '',
      vendorName: data.vendorName || '',
      vendorContact: data.vendorContact || '',
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      endDate: data.endDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      annualCost: data.annualCost || 0,
      visitsPerYear: data.visitsPerYear || 4,
      completedVisits: 0,
      status: 'Active',
      scope: data.scope || 'Comprehensive maintenance service',
    };
    this.amcList = [newItem, ...this.amcList];
    return newItem;
  }
}

export const mockRepairStore = new MockRepairStore();
