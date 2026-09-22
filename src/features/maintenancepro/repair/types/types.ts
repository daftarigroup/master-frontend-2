// Indent types for Repair Botivate

export interface Indent {
  id: string;
  timestamp?: string;
  createdAt: string;
  updatedAt: string;
  indentNumber: string;
  machineName: string;
  machineSerialNo: string;
  doerName: string;
  department: string;
  firmId?: string | null;
  firmName?: string;
  machinePartName: string;
  problem: string;
  priority: 'High' | 'Medium' | 'Low';
  expectedDeliveryDays: number;
  location: string;
  taskStatus: string;
  image?: string;
  remarks: string;
  soundOfMachine?: string;
  temperature?: string;
  maintenanceCost?: number;
  vendorType?: 'Regular' | 'Three Party';
  vendorRemarks?: string;
}

export interface IndentFormData {
  machineName: string;
  machineSerialNo: string;
  doerName: string;
  department: string;
  firmId?: string;
  firmName?: string;
  machinePartName: string;
  problem: string;
  priority: 'High' | 'Medium' | 'Low';
  expectedDeliveryDays: number;
  location: string;
  remarks: string;
  soundOfMachine: string;
  temperature: string;
}

export interface IndentListResponse {
  data: Indent[];
  total: number;
}

export interface IndentFilters {
  searchTerm: string;
  priority: string;
  firmId?: string;
}
