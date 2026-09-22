// Storein types
export interface StoreinItem {
  id: number;
  indentNumber: string;
  machineName: string;
  returnedDate: string;
  condition: string;
  inspectedBy: string;
  remarks: string;
}
export interface StoreinFilters {
  searchTerm: string;
  condition: string;
}
