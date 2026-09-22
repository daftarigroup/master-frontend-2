/**
 * In-memory Mock Data Store for the Maintenance Module
 * Interconnected with mockAssetStore for unified asset/machine status.
 */
import { mockAssetStore } from './mockAssetStore';

export interface MachineDepartment {
  id: string;
  name: string;
}

export interface MachinePart {
  id: string;
  machineId: string;
  partName: string;
  partNumber: string;
  cost: number;
  stockQty: number;
  minStockQty: number;
  supplier?: string;
  installedDate?: string;
  lifespanHours?: number;
}

export interface Machine {
  id: string;
  tenantId?: string;
  departmentId: string | null;
  department: MachineDepartment | null;
  name: string;
  assetCode: string;
  qrCode: string | null;
  serialNumber: string | null;
  modelNumber: string | null;
  manufacturer: string | null;
  supplier: string | null;
  category: string;
  subCategory: string | null;
  criticalityLevel: number;
  location: string | null;
  locationCode: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  installationDate: string | null;
  warrantyExpiry: string | null;
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'BREAKDOWN' | 'IDLE' | 'DECOMMISSIONED';
  statusChangedAt: string | null;
  runningHours: number;
  specifications?: Record<string, unknown> | null;
  isActive: boolean;
  imageUrl: string | null;
  documentUrls: string[];
  createdAt: string;
  updatedAt: string;
  parts?: MachinePart[];
  _count?: {
    workOrders: number;
    breakdownReports: number;
    downTimeLogs: number;
    parts: number;
    maintenancePlans?: number;
  };
}

export interface MaintenancePlan {
  id: string;
  planName: string;
  machineId: string;
  machineName: string;
  department: string;
  category: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY';
  frequencyInterval?: number;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  nextServiceDate: string;
  tasks: string[];
  estimatedMinutes: number;
  notes?: string;
  createdAt: string;
}

export interface MaintenanceWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  planId?: string;
  machineId: string;
  machineName: string;
  assetCode: string;
  department: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'PENDING' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'SKIPPED' | string;
  assignedToId?: string;
  assignedToName: string;
  dueDate: string;
  completedDate?: string;
  isRepair: boolean;
  tasks: { id: string; text: string; done: boolean }[];
  remarks?: string;
  actualDurationMinutes?: number;
  cost?: number;
  createdAt: string;
}

export interface BreakdownReport {
  id: string;
  breakdownNumber: string;
  machineId: string;
  machineName: string;
  assetCode: string;
  department: string;
  reportedBy: string;
  reportedAt: string;
  problem: string;
  severity: 'Minor' | 'Major' | 'Critical';
  status: 'Reported' | 'Assigned' | 'In Progress' | 'Resolved';
  isResolved: boolean;
  resolvedAt?: string;
  downtimeHours?: number;
  technicianName?: string;
  rootCause?: string;
  actionTaken?: string;
}

export interface DailyMachineLog {
  id: string;
  date: string;
  machineId: string;
  machineName: string;
  operatorName: string;
  shift: 'Morning' | 'Evening' | 'Night';
  startReading: number;
  endReading: number;
  runningHours: number;
  oilLevel: 'Normal' | 'Low' | 'Critical';
  temperature: string;
  vibration: 'Normal' | 'High';
  status: 'Normal' | 'Warning' | 'Breakdown';
  remarks?: string;
}

class MockMaintenanceStore {
  private machines: Machine[] = [
    {
      id: '1',
      name: 'CNC Milling Machine 5-Axis',
      assetCode: 'SN-0004',
      qrCode: 'SN-0004',
      serialNumber: 'SR2025000003',
      modelNumber: 'VF-2SS',
      manufacturer: 'Haas Automation',
      supplier: 'Machine Tools India',
      category: 'PRODUCTION',
      subCategory: 'Milling',
      criticalityLevel: 5,
      location: 'Shop Floor A',
      locationCode: 'SFA-01',
      departmentId: '1',
      department: { id: '1', name: 'Production' },
      purchaseDate: '2024-03-01',
      purchasePrice: 1850000,
      installationDate: '2024-03-15',
      warrantyExpiry: '2027-03-01',
      status: 'OPERATIONAL',
      statusChangedAt: '2024-03-15',
      runningHours: 1240,
      isActive: true,
      imageUrl: null,
      documentUrls: [],
      createdAt: '2024-03-15',
      updatedAt: '2026-09-17',
      _count: { workOrders: 4, breakdownReports: 1, downTimeLogs: 1, parts: 3, maintenancePlans: 2 },
      parts: [
        { id: 'p1', machineId: '1', partName: 'Spindle Bearing Set', partNumber: 'SB-7014', cost: 18500, stockQty: 2, minStockQty: 1 },
        { id: 'p2', machineId: '1', partName: 'Coolant Pump 0.5HP', partNumber: 'CP-050', cost: 6200, stockQty: 1, minStockQty: 1 },
        { id: 'p3', machineId: '1', partName: 'Tool Release Piston Seal', partNumber: 'TRP-10', cost: 1200, stockQty: 5, minStockQty: 2 },
      ],
    },
    {
      id: '2',
      name: 'Hydraulic Press 100T',
      assetCode: 'SN-0005',
      qrCode: 'SN-0005',
      serialNumber: 'SR2025000004',
      modelNumber: 'HP-100',
      manufacturer: 'Schuler',
      supplier: 'Industrial Presses Ltd',
      category: 'PRODUCTION',
      subCategory: 'Press',
      criticalityLevel: 4,
      location: 'Bay 2',
      locationCode: 'BAY-02',
      departmentId: '1',
      department: { id: '1', name: 'Production' },
      purchaseDate: '2024-01-10',
      purchasePrice: 950000,
      installationDate: '2024-01-20',
      warrantyExpiry: '2027-01-10',
      status: 'OPERATIONAL',
      statusChangedAt: '2024-01-20',
      runningHours: 890,
      isActive: true,
      imageUrl: null,
      documentUrls: [],
      createdAt: '2024-01-20',
      updatedAt: '2026-09-17',
      _count: { workOrders: 3, breakdownReports: 0, downTimeLogs: 0, parts: 2, maintenancePlans: 1 },
      parts: [
        { id: 'p4', machineId: '2', partName: 'Hydraulic Cylinder Seal Kit', partNumber: 'HCSK-100', cost: 4800, stockQty: 3, minStockQty: 1 },
        { id: 'p5', machineId: '2', partName: 'Pressure Relief Valve', partNumber: 'PRV-350', cost: 8900, stockQty: 1, minStockQty: 1 },
      ],
    },
    {
      id: '3',
      name: 'Air Compressor 500L',
      assetCode: 'SN-0006',
      qrCode: 'SN-0006',
      serialNumber: 'SR2025000005',
      modelNumber: 'GX-11',
      manufacturer: 'Atlas Copco',
      supplier: 'Atlas Copco India',
      category: 'UTILITY',
      subCategory: 'Compressor',
      criticalityLevel: 4,
      location: 'Utility Room',
      locationCode: 'UTL-01',
      departmentId: '2',
      department: { id: '2', name: 'Utility' },
      purchaseDate: '2024-02-15',
      purchasePrice: 420000,
      installationDate: '2024-02-25',
      warrantyExpiry: '2026-02-15',
      status: 'OPERATIONAL',
      statusChangedAt: '2024-02-25',
      runningHours: 3450,
      isActive: true,
      imageUrl: null,
      documentUrls: [],
      createdAt: '2024-02-25',
      updatedAt: '2026-09-17',
      _count: { workOrders: 5, breakdownReports: 0, downTimeLogs: 0, parts: 3, maintenancePlans: 1 },
      parts: [
        { id: 'p6', machineId: '3', partName: 'Air Filter Element', partNumber: 'AF-11', cost: 950, stockQty: 8, minStockQty: 2 },
        { id: 'p7', machineId: '3', partName: 'Oil Filter', partNumber: 'OF-11', cost: 1450, stockQty: 6, minStockQty: 2 },
        { id: 'p8', machineId: '3', partName: 'Drive Belt V-Belt', partNumber: 'VB-42', cost: 800, stockQty: 4, minStockQty: 2 },
      ],
    },
    {
      id: '4',
      name: 'Forklift Electric 3T',
      assetCode: 'SN-0007',
      qrCode: 'SN-0007',
      serialNumber: 'SR2025000006',
      modelNumber: 'FB30',
      manufacturer: 'Toyota Material Handling',
      supplier: 'Toyota India',
      category: 'MATERIAL_HANDLING',
      subCategory: 'Forklift',
      criticalityLevel: 3,
      location: 'Warehouse A',
      locationCode: 'WHA-FL',
      departmentId: '3',
      department: { id: '3', name: 'Warehouse' },
      purchaseDate: '2024-04-01',
      purchasePrice: 1200000,
      installationDate: '2024-04-10',
      warrantyExpiry: '2027-04-01',
      status: 'OPERATIONAL',
      statusChangedAt: '2024-04-10',
      runningHours: 620,
      isActive: true,
      imageUrl: null,
      documentUrls: [],
      createdAt: '2024-04-10',
      updatedAt: '2026-09-17',
      _count: { workOrders: 2, breakdownReports: 0, downTimeLogs: 0, parts: 2, maintenancePlans: 1 },
    },
    {
      id: '5',
      name: 'Packaging Line Robot',
      assetCode: 'SN-0008',
      qrCode: 'SN-0008',
      serialNumber: 'SR2025000007',
      modelNumber: 'IRB 4600',
      manufacturer: 'ABB',
      supplier: 'ABB India',
      category: 'PRODUCTION',
      subCategory: 'Robotics',
      criticalityLevel: 5,
      location: 'Packaging Line 3',
      locationCode: 'PKG-03',
      departmentId: '4',
      department: { id: '4', name: 'Packaging' },
      purchaseDate: '2024-05-15',
      purchasePrice: 2400000,
      installationDate: '2024-06-01',
      warrantyExpiry: '2027-05-15',
      status: 'BREAKDOWN',
      statusChangedAt: '2026-09-17',
      runningHours: 2100,
      isActive: true,
      imageUrl: null,
      documentUrls: [],
      createdAt: '2024-06-01',
      updatedAt: '2026-09-17',
      _count: { workOrders: 6, breakdownReports: 2, downTimeLogs: 2, parts: 1, maintenancePlans: 1 },
    },
    {
      id: '6',
      name: 'Diesel Generator 250kVA',
      assetCode: 'SN-0009',
      qrCode: 'SN-0009',
      serialNumber: 'SR2025000008',
      modelNumber: 'C250D5',
      manufacturer: 'Cummins',
      supplier: 'Cummins Power',
      category: 'ELECTRICAL',
      subCategory: 'Generator',
      criticalityLevel: 5,
      location: 'Power House',
      locationCode: 'PWR-01',
      departmentId: '5',
      department: { id: '5', name: 'Maintenance' },
      purchaseDate: '2023-11-01',
      purchasePrice: 1650000,
      installationDate: '2023-11-15',
      warrantyExpiry: '2026-11-01',
      status: 'OPERATIONAL',
      statusChangedAt: '2023-11-15',
      runningHours: 480,
      isActive: true,
      imageUrl: null,
      documentUrls: [],
      createdAt: '2023-11-15',
      updatedAt: '2026-09-17',
      _count: { workOrders: 4, breakdownReports: 0, downTimeLogs: 0, parts: 2, maintenancePlans: 1 },
    },
  ];

  private plans: MaintenancePlan[] = [
    {
      id: 'pl-1',
      planName: 'Monthly Spindle Lubrication & Filter Clean',
      machineId: '1',
      machineName: 'CNC Milling Machine 5-Axis',
      department: 'Production',
      category: 'PRODUCTION',
      frequency: 'MONTHLY',
      priority: 'High',
      assignedTo: 'Vikram Sharma',
      status: 'ACTIVE',
      nextServiceDate: '2026-10-01',
      tasks: ['Check spindle oil level', 'Replace air intake filter', 'Clean coolant nozzle', 'Check axis backlash'],
      estimatedMinutes: 60,
      createdAt: '2025-01-01',
    },
    {
      id: 'pl-2',
      planName: 'Quarterly Hydraulic Fluid & Pressure Check',
      machineId: '2',
      machineName: 'Hydraulic Press 100T',
      department: 'Production',
      category: 'PRODUCTION',
      frequency: 'QUARTERLY',
      priority: 'Medium',
      assignedTo: 'Sunil Verma',
      status: 'ACTIVE',
      nextServiceDate: '2026-10-15',
      tasks: ['Check pressure gauges calibration', 'Inspect hoses for leaks', 'Top up hydraulic oil ISO 68'],
      estimatedMinutes: 90,
      createdAt: '2025-01-01',
    },
    {
      id: 'pl-3',
      planName: 'Bi-Weekly Air Compressor Inspection',
      machineId: '3',
      machineName: 'Air Compressor 500L',
      department: 'Utility',
      category: 'UTILITY',
      frequency: 'BIWEEKLY',
      priority: 'Low',
      assignedTo: 'Vikram Sharma',
      status: 'ACTIVE',
      nextServiceDate: '2026-09-25',
      tasks: ['Check belt tension', 'Drain tank condensation', 'Check oil level', 'Inspect safety valve'],
      estimatedMinutes: 30,
      createdAt: '2025-01-01',
    },
    {
      id: 'pl-4',
      planName: 'Monthly Forklift Battery & Brake Inspection',
      machineId: '4',
      machineName: 'Forklift Electric 3T',
      department: 'Warehouse',
      category: 'MATERIAL_HANDLING',
      frequency: 'MONTHLY',
      priority: 'Medium',
      assignedTo: 'Amit Singh',
      status: 'ACTIVE',
      nextServiceDate: '2026-09-28',
      tasks: ['Check distilled water level in cells', 'Measure brake pad thickness', 'Check mast chain tension'],
      estimatedMinutes: 45,
      createdAt: '2025-01-01',
    },
  ];

  private workOrders: MaintenanceWorkOrder[] = [
    {
      id: 'wo-1',
      workOrderNumber: 'WO-2026-001',
      title: 'Monthly Spindle Lubrication & Filter Clean',
      planId: 'pl-1',
      machineId: '1',
      machineName: 'CNC Milling Machine 5-Axis',
      assetCode: 'SN-0004',
      department: 'Production',
      priority: 'High',
      status: 'PENDING',
      assignedToName: 'Vikram Sharma',
      dueDate: '2026-09-20',
      isRepair: false,
      tasks: [
        { id: 't1', text: 'Check spindle oil level', done: true },
        { id: 't2', text: 'Replace air intake filter', done: false },
        { id: 't3', text: 'Clean coolant nozzle', done: false },
      ],
      createdAt: '2026-09-01',
    },
    {
      id: 'wo-2',
      workOrderNumber: 'WO-2026-002',
      title: 'Hydraulic Pressure & Fluid Inspection',
      planId: 'pl-2',
      machineId: '2',
      machineName: 'Hydraulic Press 100T',
      assetCode: 'SN-0005',
      department: 'Production',
      priority: 'Medium',
      status: 'IN_PROGRESS',
      assignedToName: 'Sunil Verma',
      dueDate: '2026-09-22',
      isRepair: false,
      tasks: [
        { id: 't4', text: 'Check pressure gauges', done: true },
        { id: 't5', text: 'Inspect hoses for leaks', done: true },
        { id: 't6', text: 'Top up hydraulic oil', done: false },
      ],
      createdAt: '2026-09-05',
    },
    {
      id: 'wo-3',
      workOrderNumber: 'WO-2026-003',
      title: 'Air Compressor Belt & Valve Check',
      planId: 'pl-3',
      machineId: '3',
      machineName: 'Air Compressor 500L',
      assetCode: 'SN-0006',
      department: 'Utility',
      priority: 'Low',
      status: 'COMPLETED',
      assignedToName: 'Vikram Sharma',
      dueDate: '2026-09-12',
      completedDate: '2026-09-12',
      actualDurationMinutes: 25,
      isRepair: false,
      tasks: [
        { id: 't7', text: 'Check belt tension', done: true },
        { id: 't8', text: 'Drain tank condensation', done: true },
      ],
      createdAt: '2026-09-01',
    },
    {
      id: 'wo-4',
      workOrderNumber: 'WO-2026-004',
      title: 'Packaging Line Robot Gripper Breakdown Repair',
      machineId: '5',
      machineName: 'Packaging Line Robot',
      assetCode: 'SN-0008',
      department: 'Packaging',
      priority: 'High',
      status: 'OVERDUE',
      assignedToName: 'Amit Singh',
      dueDate: '2026-09-15',
      isRepair: true,
      tasks: [
        { id: 't9', text: 'Inspect servo motor encoder', done: true },
        { id: 't10', text: 'Replace broken gripper pneumatic valve', done: false },
      ],
      createdAt: '2026-09-14',
    },
    {
      id: 'wo-5',
      workOrderNumber: 'WO-2026-005',
      title: 'Forklift Battery Water Top-Up & Mast Inspection',
      planId: 'pl-4',
      machineId: '4',
      machineName: 'Forklift Electric 3T',
      assetCode: 'SN-0007',
      department: 'Warehouse',
      priority: 'Medium',
      status: 'PENDING_APPROVAL',
      assignedToName: 'Sunil Verma',
      dueDate: '2026-09-16',
      isRepair: false,
      tasks: [
        { id: 't11', text: 'Water level in cells', done: true },
        { id: 't12', text: 'Chain tension check', done: true },
      ],
      createdAt: '2026-09-02',
    },
  ];

  private breakdowns: BreakdownReport[] = [
    {
      id: 'br-1',
      breakdownNumber: 'BD-2026-001',
      machineId: '5',
      machineName: 'Packaging Line Robot',
      assetCode: 'SN-0008',
      department: 'Packaging',
      reportedBy: 'Dinesh Patel',
      reportedAt: '2026-09-17 09:30',
      problem: 'Gripper pneumatic actuator jammed, causing line stoppage and error code E-404',
      severity: 'Critical',
      status: 'In Progress',
      isResolved: false,
      technicianName: 'Amit Singh',
    },
    {
      id: 'br-2',
      breakdownNumber: 'BD-2026-002',
      machineId: '1',
      machineName: 'CNC Milling Machine 5-Axis',
      assetCode: 'SN-0004',
      department: 'Production',
      reportedBy: 'Ramesh Joshi',
      reportedAt: '2026-09-10 11:15',
      problem: 'Coolant pump motor overheating and tripping breaker',
      severity: 'Major',
      status: 'Resolved',
      isResolved: true,
      resolvedAt: '2026-09-10 14:45',
      downtimeHours: 3.5,
      technicianName: 'Vikram Sharma',
      rootCause: 'Coolant filter clogged with aluminum chips',
      actionTaken: 'Replaced coolant filter and flushed lines',
    },
  ];

  private dailyLogs: DailyMachineLog[] = [
    {
      id: 'log-1',
      date: '2026-09-17',
      machineId: '1',
      machineName: 'CNC Milling Machine 5-Axis',
      operatorName: 'Ramesh Joshi',
      shift: 'Morning',
      startReading: 1232,
      endReading: 1240,
      runningHours: 8,
      oilLevel: 'Normal',
      temperature: '42°C',
      vibration: 'Normal',
      status: 'Normal',
      remarks: 'Smooth operation throughout shift',
    },
    {
      id: 'log-2',
      date: '2026-09-17',
      machineId: '2',
      machineName: 'Hydraulic Press 100T',
      operatorName: 'Mahesh Kumar',
      shift: 'Morning',
      startReading: 884,
      endReading: 890,
      runningHours: 6,
      oilLevel: 'Normal',
      temperature: '48°C',
      vibration: 'Normal',
      status: 'Normal',
    },
    {
      id: 'log-3',
      date: '2026-09-17',
      machineId: '3',
      machineName: 'Air Compressor 500L',
      operatorName: 'Suresh Patil',
      shift: 'Morning',
      startReading: 3442,
      endReading: 3450,
      runningHours: 8,
      oilLevel: 'Normal',
      temperature: '55°C',
      vibration: 'Normal',
      status: 'Normal',
    },
    {
      id: 'log-4',
      date: '2026-09-17',
      machineId: '5',
      machineName: 'Packaging Line Robot',
      operatorName: 'Dinesh Patel',
      shift: 'Morning',
      startReading: 2098,
      endReading: 2100,
      runningHours: 2,
      oilLevel: 'Normal',
      temperature: '62°C',
      vibration: 'High',
      status: 'Breakdown',
      remarks: 'Machine stopped at 09:30 due to gripper actuator jam',
    },
  ];

  // --- Machines ---
  getMachines(): Machine[] {
    return this.machines;
  }

  getMachineById(id: string | number): Machine | undefined {
    return this.machines.find((m) => String(m.id) === String(id));
  }

  createMachine(data: Partial<Machine>): Machine {
    const id = String(Date.now());
    const assetCode = data.assetCode || `SN-${String(this.machines.length + 1).padStart(4, '0')}`;
    const newMachine: Machine = {
      id,
      name: data.name || 'New Machine',
      assetCode,
      qrCode: assetCode,
      serialNumber: data.serialNumber || `SR${Date.now().toString().slice(-8)}`,
      modelNumber: data.modelNumber || '',
      manufacturer: data.manufacturer || '',
      supplier: data.supplier || '',
      category: data.category || 'PRODUCTION',
      subCategory: data.subCategory || '',
      criticalityLevel: data.criticalityLevel || 3,
      location: data.location || '',
      locationCode: data.locationCode || '',
      departmentId: data.departmentId || '1',
      department: data.department || { id: '1', name: 'Production' },
      purchaseDate: data.purchaseDate || new Date().toISOString().slice(0, 10),
      purchasePrice: data.purchasePrice || 0,
      installationDate: data.installationDate || new Date().toISOString().slice(0, 10),
      warrantyExpiry: data.warrantyExpiry || '',
      status: data.status || 'OPERATIONAL',
      statusChangedAt: new Date().toISOString().slice(0, 10),
      runningHours: data.runningHours || 0,
      isActive: true,
      imageUrl: null,
      documentUrls: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      parts: data.parts || [],
      _count: { workOrders: 0, breakdownReports: 0, downTimeLogs: 0, parts: 0, maintenancePlans: 0 },
    };

    this.machines = [newMachine, ...this.machines];

    // Interconnect: Register in mockAssetStore
    mockAssetStore.createAsset({
      productName: newMachine.name,
      category: 'Machinery',
      type: 'Asset',
      brand: newMachine.manufacturer || 'General',
      model: newMachine.modelNumber || '',
      serialNo: newMachine.serialNumber || '',
      cost: newMachine.purchasePrice || 0,
      location: newMachine.location || '',
      department: newMachine.department?.name || 'Production',
      status: 'Active',
      maintenanceRequired: 'Yes',
      maintenanceType: 'Preventive',
      frequency: 'Monthly',
      priority: 'Medium',
    });

    return newMachine;
  }

  updateMachine(id: string | number, data: Partial<Machine>): Machine | undefined {
    let updated: Machine | undefined;
    this.machines = this.machines.map((m) => {
      if (String(m.id) !== String(id)) return m;
      updated = { ...m, ...data, updatedAt: new Date().toISOString().slice(0, 10) };
      return updated;
    });

    if (updated) {
      // Sync status to Asset
      const asset = mockAssetStore.getAssets().find((a) => a.sn === updated?.assetCode || a.productName === updated?.name);
      if (asset) {
        mockAssetStore.updateAsset(asset.id, {
          status: updated.status === 'BREAKDOWN' || updated.status === 'UNDER_MAINTENANCE' ? 'Under Repair' : 'Active',
        });
      }
    }

    return updated;
  }

  deleteMachine(id: string | number): void {
    this.machines = this.machines.filter((m) => String(m.id) !== String(id));
  }

  // --- Plans ---
  getPlans(): MaintenancePlan[] {
    return this.plans;
  }

  getPlanById(id: string): MaintenancePlan | undefined {
    return this.plans.find((p) => p.id === id);
  }

  createPlan(data: Partial<MaintenancePlan>): MaintenancePlan {
    const newPlan: MaintenancePlan = {
      id: `pl-${Date.now()}`,
      planName: data.planName || 'New Maintenance Plan',
      machineId: data.machineId || '1',
      machineName: data.machineName || 'Machine',
      department: data.department || 'Production',
      category: data.category || 'PRODUCTION',
      frequency: data.frequency || 'MONTHLY',
      priority: data.priority || 'Medium',
      assignedTo: data.assignedTo || 'Technician',
      status: 'ACTIVE',
      nextServiceDate: data.nextServiceDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      tasks: data.tasks || ['Inspect and lubricate'],
      estimatedMinutes: data.estimatedMinutes || 60,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.plans = [newPlan, ...this.plans];

    // Sync Asset next service
    const machine = this.getMachineById(newPlan.machineId);
    if (machine) {
      const asset = mockAssetStore.getAssets().find((a) => a.sn === machine.assetCode || a.productName === machine.name);
      if (asset) {
        mockAssetStore.updateAsset(asset.id, {
          maintenanceRequired: 'Yes',
          maintenanceType: 'Preventive',
          frequency: newPlan.frequency,
          nextService: newPlan.nextServiceDate,
          priority: newPlan.priority,
        });
      }
    }

    return newPlan;
  }

  updatePlan(id: string, data: Partial<MaintenancePlan>): MaintenancePlan | undefined {
    let updated: MaintenancePlan | undefined;
    this.plans = this.plans.map((p) => {
      if (p.id !== id) return p;
      updated = { ...p, ...data };
      return updated;
    });
    return updated;
  }

  // --- Work Orders ---
  getWorkOrders(filters?: { status?: string; isRepair?: boolean; machineId?: string }): MaintenanceWorkOrder[] {
    let list = this.workOrders;
    if (filters?.status) {
      const statuses = filters.status.split(',').map((s) => s.trim());
      list = list.filter((w) => statuses.includes(w.status));
    }
    if (filters?.isRepair !== undefined) {
      list = list.filter((w) => w.isRepair === filters.isRepair);
    }
    if (filters?.machineId) {
      list = list.filter((w) => String(w.machineId) === String(filters.machineId));
    }
    return list;
  }

  getWorkOrderById(id: string): MaintenanceWorkOrder | undefined {
    return this.workOrders.find((w) => w.id === id);
  }

  createWorkOrder(data: Partial<MaintenanceWorkOrder>): MaintenanceWorkOrder {
    const newWo: MaintenanceWorkOrder = {
      id: `wo-${Date.now()}`,
      workOrderNumber: `WO-${new Date().getFullYear()}-${String(this.workOrders.length + 1).padStart(3, '0')}`,
      title: data.title || 'Maintenance Task',
      machineId: data.machineId || '1',
      machineName: data.machineName || 'Machine',
      assetCode: data.assetCode || '',
      department: data.department || 'Production',
      priority: data.priority || 'Medium',
      status: data.status || 'PENDING',
      assignedToName: data.assignedToName || 'Unassigned',
      dueDate: data.dueDate || new Date().toISOString().slice(0, 10),
      isRepair: data.isRepair || false,
      tasks: data.tasks || [{ id: '1', text: 'General check', done: false }],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.workOrders = [newWo, ...this.workOrders];
    return newWo;
  }

  updateWorkOrder(id: string, data: Partial<MaintenanceWorkOrder>): MaintenanceWorkOrder | undefined {
    let updated: MaintenanceWorkOrder | undefined;
    this.workOrders = this.workOrders.map((w) => {
      if (w.id !== id) return w;
      updated = { ...w, ...data };
      return updated;
    });

    if (updated && (updated.status === 'COMPLETED' || data.status === 'COMPLETED')) {
      // Interconnect: increment maintenanceCount on the Asset!
      const asset = mockAssetStore.getAssets().find((a) => a.sn === updated?.assetCode || a.productName === updated?.machineName);
      if (asset) {
        mockAssetStore.updateAsset(asset.id, {
          maintenanceCount: (asset.maintenanceCount || 0) + 1,
          lastMaintenanceDate: new Date().toISOString().slice(0, 10),
        });
      }
    }

    return updated;
  }

  // --- Breakdowns ---
  getBreakdowns(): BreakdownReport[] {
    return this.breakdowns;
  }

  createBreakdown(data: Partial<BreakdownReport>): BreakdownReport {
    const id = `br-${Date.now()}`;
    const newBd: BreakdownReport = {
      id,
      breakdownNumber: `BD-${new Date().getFullYear()}-${String(this.breakdowns.length + 1).padStart(3, '0')}`,
      machineId: data.machineId || '1',
      machineName: data.machineName || 'Machine',
      assetCode: data.assetCode || '',
      department: data.department || 'Production',
      reportedBy: data.reportedBy || 'Operator',
      reportedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      problem: data.problem || 'Breakdown reported',
      severity: data.severity || 'Major',
      status: 'Reported',
      isResolved: false,
    };
    this.breakdowns = [newBd, ...this.breakdowns];

    // Interconnect: Set Machine and Asset status to 'BREAKDOWN' / 'Under Repair'
    this.updateMachine(newBd.machineId, { status: 'BREAKDOWN' });
    const asset = mockAssetStore.getAssets().find((a) => a.sn === newBd.assetCode || a.productName === newBd.machineName);
    if (asset) {
      mockAssetStore.updateAsset(asset.id, { status: 'Under Repair' });
    }

    return newBd;
  }

  resolveBreakdown(id: string, notes?: string): BreakdownReport | undefined {
    let updated: BreakdownReport | undefined;
    this.breakdowns = this.breakdowns.map((b) => {
      if (b.id !== id) return b;
      updated = {
        ...b,
        status: 'Resolved',
        isResolved: true,
        resolvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        actionTaken: notes || 'Repaired and cleared for operation',
      };
      return updated;
    });

    if (updated) {
      this.updateMachine(updated.machineId, { status: 'OPERATIONAL' });
      const asset = mockAssetStore.getAssets().find((a) => a.sn === updated?.assetCode || a.productName === updated?.machineName);
      if (asset) {
        mockAssetStore.updateAsset(asset.id, { status: 'Active' });
      }
    }

    return updated;
  }

  // --- Daily Machine Logs ---
  getDailyLogs(): DailyMachineLog[] {
    return this.dailyLogs;
  }

  createDailyLog(data: Partial<DailyMachineLog>): DailyMachineLog {
    const newLog: DailyMachineLog = {
      id: `log-${Date.now()}`,
      date: data.date || new Date().toISOString().slice(0, 10),
      machineId: data.machineId || '1',
      machineName: data.machineName || 'Machine',
      operatorName: data.operatorName || 'Operator',
      shift: data.shift || 'Morning',
      startReading: data.startReading || 0,
      endReading: data.endReading || 0,
      runningHours: data.runningHours || ((data.endReading || 0) - (data.startReading || 0)),
      oilLevel: data.oilLevel || 'Normal',
      temperature: data.temperature || '40°C',
      vibration: data.vibration || 'Normal',
      status: data.status || 'Normal',
      remarks: data.remarks || '',
    };
    this.dailyLogs = [newLog, ...this.dailyLogs];
    return newLog;
  }
}

export const mockMaintenanceStore = new MockMaintenanceStore();
