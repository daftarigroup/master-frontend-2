import type { AssetProduct, AssetRepair, AssetUser, MachinePart, NewAssetProduct } from '@/systems/asset/types';

const PRODUCTS_KEY = 'asset_mock_products_v1';
const USERS_KEY = 'asset_mock_users_v1';
const MACHINES_KEY = 'asset_mock_machines_v1';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private mode / SSR) — mock data just won't persist.
  }
}

function seedUsers(): AssetUser[] {
  return [
    { id: 1, user_name: 'Rakesh Sharma', unit: 'Plant 1' },
    { id: 2, user_name: 'Priya Nair', unit: 'Plant 1' },
    { id: 3, user_name: 'Amit Verma', unit: 'Plant 2' },
    { id: 4, user_name: 'Sunita Rao', unit: 'Head Office' },
    { id: 5, user_name: 'Vikram Singh', unit: 'Warehouse' },
    { id: 6, user_name: 'Deepak Joshi', unit: 'Plant 2' },
  ];
}

function seedMachineParts(): MachinePart[] {
  return [
    {
      id: 101,
      machine_name: 'Hydraulic Press HP-200',
      machine_area: 'Bay 4',
      machine_division: 'SID',
      machine_department: 'Mechanical',
      part_name: ['Hydraulic Pump', 'Pressure Valve', 'Main Cylinder'],
      created_at: '2023-11-02T09:00:00Z',
    },
    {
      id: 102,
      machine_name: 'CNC Lathe CL-56',
      machine_area: 'Bay 1',
      machine_division: 'SMS',
      machine_department: 'Mechanical',
      part_name: ['Spindle Motor', 'Tool Turret', 'Coolant Pump'],
      created_at: '2024-01-15T09:00:00Z',
    },
    {
      id: 103,
      machine_name: 'Rolling Mill Motor RM-9',
      machine_area: 'Line 2',
      machine_division: 'Rolling Mill',
      machine_department: 'Electrical',
      part_name: ['Main Drive', 'Cooling Fan', 'Control Panel'],
      created_at: '2024-03-20T09:00:00Z',
    },
    {
      id: 104,
      machine_name: 'Air Compressor AC-40',
      machine_area: 'Utility Yard',
      machine_division: 'CPP',
      machine_department: 'Operation',
      part_name: ['Compressor Head', 'Air Filter'],
      created_at: '2024-05-08T09:00:00Z',
    },
  ];
}

function seedProducts(): AssetProduct[] {
  const now = new Date().toISOString();
  return [
    {
      id: 1,
      sn: 'AST-0001',
      productName: 'Hydraulic Press HP-200',
      category: 'Machinery',
      type: 'Asset',
      brand: 'Caterpillar',
      model: 'HP-200X',
      serialNo: 'CAT-HP200-8841',
      sku: 'AST-0001',
      mfgDate: '2022-06',
      origin: 'Germany',
      status: 'Active',
      location: 'Plant 1',
      department: 'Mechanical',
      division: 'SID',
      machineArea: 'Bay 4',
      assignedTo: 'Rakesh Sharma',
      usageType: 'Internal',
      storageLoc: 'Rack B-12',
      responsiblePerson: 'Sunita Rao',
      assetDate: '2022-07-10',
      invoiceNo: 'INV-2022-0451',
      assetValue: 850000,
      cost: 850000,
      quantity: '1',
      supplierName: 'ABC Industrial Supplies',
      supplierPhone: '+91 9876543210',
      supplierEmail: 'sales@abcindustrial.example',
      paymentMode: 'Credit / PO',
      depMethod: 'Straight Line',
      depRate: '10',
      assetLife: '15',
      residualValue: '50000',
      warrantyAvailable: 'Yes',
      warrantyProvider: 'Caterpillar India',
      warrantyStart: '2022-07-10',
      warrantyEnd: '2025-07-10',
      amc: 'Yes',
      amcProvider: 'Caterpillar India',
      amcStart: '2024-01-01',
      amcEnd: '2025-12-31',
      serviceContact: '+91 1800 123 456',
      runningHours: 4200,
      installationDate: '2022-07-15',
      operationalStatus: 'Running',
      maintenanceRequired: 'Yes',
      maintenanceType: 'Preventive',
      frequency: 'Monthly',
      nextService: '2026-09-20',
      priority: 'Medium',
      technician: 'Deepak Joshi',
      maintenanceNotes: 'Use ISO VG 46 hydraulic oil. Check seals every service.',
      specs: [
        { name: 'Hydraulic Pump' },
        { name: 'Pressure Valve' },
        { name: 'Main Cylinder' },
      ],
      internalNotes: 'Primary press for the SID line, high utilization.',
      usageRemarks: 'Running well, minor vibration noted last inspection.',
      condition: 'Good',
      documents: [],
      machineId: 101,
      initialEntryDate: '2023-11-02T09:00:00Z',
      isFromMachineParts: true,
      lastRepairDate: '2026-04-12',
      repairCost: 8500,
      repairCount: 2,
      totalRepairCost: 15200,
      partChanged: 'Yes',
      partNames: ['Pressure Valve', 'Seal Kit'],
      createdBy: 'System',
      createdDate: now,
    },
    {
      id: 2,
      sn: 'AST-0002',
      productName: 'Dell Latitude 5420 Laptop',
      category: 'IT',
      type: 'Asset',
      brand: 'Dell',
      model: 'Latitude 5420',
      serialNo: 'DL5420-9931',
      sku: 'AST-0002',
      mfgDate: '2023-02',
      origin: 'China',
      status: 'Active',
      location: 'Head Office',
      department: 'Account',
      division: 'Admin',
      machineArea: '',
      assignedTo: 'Sunita Rao',
      usageType: 'Internal',
      storageLoc: '',
      responsiblePerson: 'Sunita Rao',
      assetDate: '2023-03-05',
      invoiceNo: 'INV-2023-1187',
      assetValue: 68000,
      cost: 68000,
      quantity: '1',
      supplierName: 'Dell Technologies',
      supplierPhone: '+91 1800 425 4026',
      supplierEmail: 'orders@dell.example',
      paymentMode: 'Online',
      depMethod: 'Written Down Value (WDV)',
      depRate: '20',
      assetLife: '5',
      residualValue: '5000',
      warrantyAvailable: 'Yes',
      warrantyProvider: 'Dell India',
      warrantyStart: '2023-03-05',
      warrantyEnd: '2026-03-05',
      amc: 'No',
      amcProvider: '',
      amcStart: '',
      amcEnd: '',
      serviceContact: '1800 425 4026',
      runningHours: 0,
      installationDate: '2023-03-06',
      operationalStatus: 'Running',
      maintenanceRequired: 'No',
      maintenanceType: 'Preventive',
      frequency: 'Yearly',
      nextService: '',
      priority: 'Low',
      technician: '',
      maintenanceNotes: '',
      specs: [
        { name: 'Intel Core i5-1145G7' },
        { name: '16GB RAM' },
        { name: '512GB SSD' },
      ],
      internalNotes: 'Issued to Accounts department.',
      usageRemarks: '',
      condition: 'Good',
      documents: [],
      machineId: null,
      initialEntryDate: '2023-03-05T09:00:00Z',
      isFromMachineParts: false,
      lastRepairDate: '',
      repairCost: '',
      repairCount: 0,
      totalRepairCost: '',
      partChanged: 'No',
      partNames: [],
      createdBy: 'System',
      createdDate: now,
    },
    {
      id: 3,
      sn: 'AST-0003',
      productName: 'CNC Lathe CL-56',
      category: 'Machinery',
      type: 'Asset',
      brand: 'Komatsu',
      model: 'CL-56',
      serialNo: 'KOM-CL56-2210',
      sku: 'AST-0003',
      mfgDate: '2021-09',
      origin: 'Japan',
      status: 'Active',
      location: 'Plant 1',
      department: 'Mechanical',
      division: 'SMS',
      machineArea: 'Bay 1',
      assignedTo: 'Amit Verma',
      usageType: 'Internal',
      storageLoc: '',
      responsiblePerson: 'Rakesh Sharma',
      assetDate: '2021-10-01',
      invoiceNo: 'INV-2021-0932',
      assetValue: 1250000,
      cost: 1250000,
      quantity: '1',
      supplierName: 'Komatsu India',
      supplierPhone: '+91 9812345670',
      supplierEmail: 'sales@komatsu.example',
      paymentMode: 'Credit / PO',
      depMethod: 'Straight Line',
      depRate: '8',
      assetLife: '20',
      residualValue: '100000',
      warrantyAvailable: 'No',
      warrantyProvider: '',
      warrantyStart: '',
      warrantyEnd: '',
      amc: 'Yes',
      amcProvider: 'Komatsu Service',
      amcStart: '2025-01-01',
      amcEnd: '2025-12-31',
      serviceContact: '+91 1800 987 654',
      runningHours: 9100,
      installationDate: '2021-10-05',
      operationalStatus: 'Maintenance Due',
      maintenanceRequired: 'Yes',
      maintenanceType: 'Preventive',
      frequency: 'Quarterly',
      nextService: '2026-09-10',
      priority: 'High',
      technician: 'Amit Verma',
      maintenanceNotes: 'Spindle bearing due for inspection.',
      specs: [
        { name: 'Spindle Motor' },
        { name: 'Tool Turret' },
        { name: 'Coolant Pump' },
      ],
      internalNotes: 'Heavily used machine, schedule downtime carefully.',
      usageRemarks: 'Slight overheating during long runs.',
      condition: 'Fair',
      documents: [],
      machineId: 102,
      initialEntryDate: '2024-01-15T09:00:00Z',
      isFromMachineParts: true,
      lastRepairDate: '2026-06-02',
      repairCost: 12500,
      repairCount: 3,
      totalRepairCost: 31800,
      partChanged: 'Yes',
      partNames: ['Coolant Pump', 'Tool Turret'],
      createdBy: 'System',
      createdDate: now,
    },
    {
      id: 4,
      sn: 'AST-0004',
      productName: 'Office Workstation Desk',
      category: 'Furniture',
      type: 'Non-Consumable',
      brand: 'Godrej Interio',
      model: 'ErgoDesk 120',
      serialNo: '',
      sku: 'AST-0004',
      mfgDate: '2023-01',
      origin: 'India',
      status: 'Active',
      location: 'Head Office',
      department: 'Account',
      division: 'Admin',
      machineArea: '',
      assignedTo: 'Priya Nair',
      usageType: 'Internal',
      storageLoc: '',
      responsiblePerson: '',
      assetDate: '2023-02-11',
      invoiceNo: 'INV-2023-0056',
      assetValue: 14500,
      cost: 14500,
      quantity: '1',
      supplierName: 'Godrej Interio',
      supplierPhone: '',
      supplierEmail: '',
      paymentMode: 'Cash',
      depMethod: 'Straight Line',
      depRate: '10',
      assetLife: '10',
      residualValue: '1000',
      warrantyAvailable: 'No',
      warrantyProvider: '',
      warrantyStart: '',
      warrantyEnd: '',
      amc: 'No',
      amcProvider: '',
      amcStart: '',
      amcEnd: '',
      serviceContact: '',
      runningHours: 0,
      installationDate: '',
      operationalStatus: 'Running',
      maintenanceRequired: 'No',
      maintenanceType: 'Preventive',
      frequency: 'Yearly',
      nextService: '',
      priority: 'Low',
      technician: '',
      maintenanceNotes: '',
      specs: [],
      internalNotes: '',
      usageRemarks: '',
      condition: 'Good',
      documents: [],
      machineId: null,
      initialEntryDate: '2023-02-11T09:00:00Z',
      isFromMachineParts: false,
      lastRepairDate: '',
      repairCost: '',
      repairCount: 0,
      totalRepairCost: '',
      partChanged: 'No',
      partNames: [],
      createdBy: 'System',
      createdDate: now,
    },
    {
      id: 5,
      sn: 'AST-0005',
      productName: 'Rolling Mill Motor RM-9',
      category: 'Machinery',
      type: 'Asset',
      brand: 'Siemens',
      model: 'RM-9',
      serialNo: 'SIE-RM9-5567',
      sku: 'AST-0005',
      mfgDate: '2020-04',
      origin: 'Germany',
      status: 'Active',
      location: 'Plant 2',
      department: 'Electrical',
      division: 'Rolling Mill',
      machineArea: 'Line 2',
      assignedTo: 'Amit Verma',
      usageType: 'Internal',
      storageLoc: '',
      responsiblePerson: 'Amit Verma',
      assetDate: '2020-05-18',
      invoiceNo: 'INV-2020-0221',
      assetValue: 2100000,
      cost: 2100000,
      quantity: '1',
      supplierName: 'Siemens Ltd',
      supplierPhone: '+91 9900112233',
      supplierEmail: 'industry@siemens.example',
      paymentMode: 'Credit / PO',
      depMethod: 'Written Down Value (WDV)',
      depRate: '12',
      assetLife: '18',
      residualValue: '150000',
      warrantyAvailable: 'No',
      warrantyProvider: '',
      warrantyStart: '',
      warrantyEnd: '',
      amc: 'Yes',
      amcProvider: 'Siemens Service',
      amcStart: '2025-04-01',
      amcEnd: '2026-03-31',
      serviceContact: '+91 1800 209 1800',
      runningHours: 15600,
      installationDate: '2020-05-25',
      operationalStatus: 'Breakdown',
      maintenanceRequired: 'Yes',
      maintenanceType: 'Breakdown',
      frequency: 'Monthly',
      nextService: '2026-09-08',
      priority: 'High',
      technician: 'Deepak Joshi',
      maintenanceNotes: 'Main drive bearing replacement pending.',
      specs: [
        { name: 'Main Drive' },
        { name: 'Cooling Fan' },
        { name: 'Control Panel' },
      ],
      internalNotes: 'Critical line asset — prioritize repair requests.',
      usageRemarks: 'Currently down, awaiting spare part delivery.',
      condition: 'Needs Repair',
      documents: [],
      machineId: 103,
      initialEntryDate: '2024-03-20T09:00:00Z',
      isFromMachineParts: true,
      lastRepairDate: '2026-08-28',
      repairCost: 42000,
      repairCount: 5,
      totalRepairCost: 96500,
      partChanged: 'Yes',
      partNames: ['Main Drive', 'Cooling Fan', 'Control Panel'],
      createdBy: 'System',
      createdDate: now,
    },
    {
      id: 6,
      sn: 'AST-0006',
      productName: 'Air Compressor AC-40',
      category: 'Machinery',
      type: 'Asset',
      brand: 'Atlas Copco',
      model: 'AC-40',
      serialNo: 'AC40-7723',
      sku: 'AST-0006',
      mfgDate: '2022-11',
      origin: 'Sweden',
      status: 'Active',
      location: 'Plant 2',
      department: 'Operation',
      division: 'CPP',
      machineArea: 'Utility Yard',
      assignedTo: 'Vikram Singh',
      usageType: 'Internal',
      storageLoc: '',
      responsiblePerson: 'Vikram Singh',
      assetDate: '2022-12-05',
      invoiceNo: 'INV-2022-0789',
      assetValue: 380000,
      cost: 380000,
      quantity: '1',
      supplierName: 'Atlas Copco India',
      supplierPhone: '+91 9922334455',
      supplierEmail: 'sales@atlascopco.example',
      paymentMode: 'Credit / PO',
      depMethod: 'Straight Line',
      depRate: '10',
      assetLife: '12',
      residualValue: '30000',
      warrantyAvailable: 'Yes',
      warrantyProvider: 'Atlas Copco India',
      warrantyStart: '2022-12-05',
      warrantyEnd: '2024-12-05',
      amc: 'No',
      amcProvider: '',
      amcStart: '',
      amcEnd: '',
      serviceContact: '+91 1800 209 8787',
      runningHours: 6800,
      installationDate: '2022-12-10',
      operationalStatus: 'Running',
      maintenanceRequired: 'Yes',
      maintenanceType: 'Preventive',
      frequency: 'Monthly',
      nextService: '2026-09-25',
      priority: 'Medium',
      technician: 'Vikram Singh',
      maintenanceNotes: 'Replace air filter monthly.',
      specs: [{ name: 'Compressor Head' }, { name: 'Air Filter' }],
      internalNotes: '',
      usageRemarks: '',
      condition: 'Good',
      documents: [],
      machineId: 104,
      initialEntryDate: '2024-05-08T09:00:00Z',
      isFromMachineParts: true,
      lastRepairDate: '',
      repairCost: '',
      repairCount: 0,
      totalRepairCost: '',
      partChanged: 'No',
      partNames: [],
      createdBy: 'System',
      createdDate: now,
    },
    {
      id: 7,
      sn: 'AST-0007',
      productName: 'Cordless Impact Drill Set',
      category: 'Tools',
      type: 'Non-Consumable',
      brand: 'Bosch',
      model: 'GSB 18V-55',
      serialNo: 'BSH-18V55-014',
      sku: 'AST-0007',
      mfgDate: '2023-07',
      origin: 'Germany',
      status: 'Active',
      location: 'Warehouse',
      department: 'Mechanical',
      division: 'SID',
      machineArea: '',
      assignedTo: 'Vikram Singh',
      usageType: 'Internal',
      storageLoc: 'Tool Crib A',
      responsiblePerson: 'Vikram Singh',
      assetDate: '2023-08-01',
      invoiceNo: 'INV-2023-0603',
      assetValue: 22000,
      cost: 22000,
      quantity: '3',
      supplierName: 'Bosch Power Tools',
      supplierPhone: '',
      supplierEmail: '',
      paymentMode: 'Online',
      depMethod: 'Straight Line',
      depRate: '15',
      assetLife: '6',
      residualValue: '2000',
      warrantyAvailable: 'Yes',
      warrantyProvider: 'Bosch India',
      warrantyStart: '2023-08-01',
      warrantyEnd: '2025-08-01',
      amc: 'No',
      amcProvider: '',
      amcStart: '',
      amcEnd: '',
      serviceContact: '',
      runningHours: 0,
      installationDate: '',
      operationalStatus: 'Running',
      maintenanceRequired: 'No',
      maintenanceType: 'Preventive',
      frequency: 'Yearly',
      nextService: '',
      priority: 'Low',
      technician: '',
      maintenanceNotes: '',
      specs: [],
      internalNotes: 'Shared tool crib inventory, set of 3 units.',
      usageRemarks: '',
      condition: 'Good',
      documents: [],
      machineId: null,
      initialEntryDate: '2023-08-01T09:00:00Z',
      isFromMachineParts: false,
      lastRepairDate: '',
      repairCost: '',
      repairCount: 0,
      totalRepairCost: '',
      partChanged: 'No',
      partNames: [],
      createdBy: 'System',
      createdDate: now,
    },
    {
      id: 8,
      sn: 'AST-0008',
      productName: 'Tata Ace Delivery Vehicle',
      category: 'Vehicles',
      type: 'Asset',
      brand: 'Tata',
      model: 'Ace Gold',
      serialNo: 'TATA-ACE-3391',
      sku: 'AST-0008',
      mfgDate: '2021-12',
      origin: 'India',
      status: 'Inactive',
      location: 'Plant 1',
      department: 'Dispatch',
      division: 'SID',
      machineArea: '',
      assignedTo: 'Rakesh Sharma',
      usageType: 'Internal',
      storageLoc: '',
      responsiblePerson: 'Sunita Rao',
      assetDate: '2022-01-20',
      invoiceNo: 'INV-2022-0034',
      assetValue: 520000,
      cost: 520000,
      quantity: '1',
      supplierName: 'Tata Motors Dealer',
      supplierPhone: '',
      supplierEmail: '',
      paymentMode: 'Credit / PO',
      depMethod: 'Written Down Value (WDV)',
      depRate: '15',
      assetLife: '10',
      residualValue: '40000',
      warrantyAvailable: 'No',
      warrantyProvider: '',
      warrantyStart: '',
      warrantyEnd: '',
      amc: 'No',
      amcProvider: '',
      amcStart: '',
      amcEnd: '',
      serviceContact: '',
      runningHours: 0,
      installationDate: '',
      operationalStatus: 'Inactive',
      maintenanceRequired: 'No',
      maintenanceType: 'Preventive',
      frequency: 'Yearly',
      nextService: '',
      priority: 'Low',
      technician: '',
      maintenanceNotes: 'Currently off-road pending re-registration.',
      specs: [],
      internalNotes: '',
      usageRemarks: 'Parked at Plant 1 yard.',
      condition: 'Fair',
      documents: [],
      machineId: null,
      initialEntryDate: '2022-01-20T09:00:00Z',
      isFromMachineParts: false,
      lastRepairDate: '2025-11-14',
      repairCost: 6200,
      repairCount: 1,
      totalRepairCost: 6200,
      partChanged: 'Yes',
      partNames: ['Clutch Plate'],
      createdBy: 'System',
      createdDate: now,
    },
  ];
}

function ensureSeeded(): void {
  if (readJson<AssetProduct[]>(PRODUCTS_KEY) === null) writeJson(PRODUCTS_KEY, seedProducts());
  if (readJson<AssetUser[]>(USERS_KEY) === null) writeJson(USERS_KEY, seedUsers());
  if (readJson<MachinePart[]>(MACHINES_KEY) === null) writeJson(MACHINES_KEY, seedMachineParts());
}

function loadProducts(): AssetProduct[] {
  ensureSeeded();
  return readJson<AssetProduct[]>(PRODUCTS_KEY) || [];
}

function saveProducts(products: AssetProduct[]): void {
  writeJson(PRODUCTS_KEY, products);
}

function nextSerialNumber(products: AssetProduct[]): string {
  const maxSeq = products.reduce((max, p) => {
    const match = /^AST-(\d+)$/.exec(p.sn || '');
    const seq = match ? parseInt(match[1], 10) : 0;
    return Number.isNaN(seq) ? max : Math.max(max, seq);
  }, 0);
  return `AST-${String(maxSeq + 1).padStart(4, '0')}`;
}

function currentUserName(): string {
  try {
    return localStorage.getItem('user-name') || 'System';
  } catch {
    return 'System';
  }
}

// Simulates network latency so loading states in the UI behave like a real API call.
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function mockGetProducts(): Promise<AssetProduct[]> {
  return delay([...loadProducts()].sort((a, b) => b.id - a.id));
}

export async function mockGetProductById(id: number | string): Promise<AssetProduct | undefined> {
  return delay(loadProducts().find((p) => String(p.id) === String(id) || p.sn === id));
}

export async function mockAddProduct(input: NewAssetProduct): Promise<AssetProduct> {
  const products = loadProducts();
  const id = products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const product: AssetProduct = {
    ...input,
    id,
    sn: nextSerialNumber(products),
    assetValue: input.assetValue,
    cost: input.cost ?? input.assetValue,
    createdBy: currentUserName(),
    createdDate: new Date().toISOString(),
  };
  products.push(product);
  saveProducts(products);
  return delay(product);
}

export async function mockUpdateProduct(id: number | string, patch: Partial<AssetProduct>): Promise<AssetProduct> {
  const products = loadProducts();
  const index = products.findIndex((p) => String(p.id) === String(id));
  if (index === -1) throw new Error('Asset not found');
  const updated: AssetProduct = {
    ...products[index],
    ...patch,
    cost: patch.cost ?? patch.assetValue ?? products[index].cost,
  };
  products[index] = updated;
  saveProducts(products);
  return delay(updated);
}

export async function mockDeleteProduct(id: number | string): Promise<{ id: number | string }> {
  const products = loadProducts().filter((p) => String(p.id) !== String(id));
  saveProducts(products);
  return delay({ id });
}

export async function mockAddRepair(productId: number | string, repair: AssetRepair): Promise<AssetProduct> {
  const products = loadProducts();
  const index = products.findIndex((p) => String(p.id) === String(productId));
  if (index === -1) throw new Error('Asset not found');
  const existing = products[index];
  const updated: AssetProduct = {
    ...existing,
    lastRepairDate: repair.repairDate,
    repairCost: repair.repairCost,
    repairCount: (existing.repairCount || 0) + 1,
    totalRepairCost: (Number(existing.totalRepairCost) || 0) + (Number(repair.repairCost) || 0),
    partChanged: repair.partChanged || existing.partChanged,
    partNames: repair.partNames?.length ? repair.partNames : existing.partNames,
  };
  products[index] = updated;
  saveProducts(products);
  return delay(updated);
}

export async function mockGetAssetUsers(): Promise<AssetUser[]> {
  ensureSeeded();
  return delay(readJson<AssetUser[]>(USERS_KEY) || []);
}

export async function mockGetMachinePartsList(): Promise<MachinePart[]> {
  ensureSeeded();
  return delay(readJson<MachinePart[]>(MACHINES_KEY) || []);
}

export function resetAssetMockData(): void {
  writeJson(PRODUCTS_KEY, seedProducts());
  writeJson(USERS_KEY, seedUsers());
  writeJson(MACHINES_KEY, seedMachineParts());
}
