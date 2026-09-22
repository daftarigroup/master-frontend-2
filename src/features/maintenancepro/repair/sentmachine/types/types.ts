// Sentmachine types
export interface SentmachineItem {
  id: number;
  indentNumber: string;
  machineName: string;
  vendor: string;
  sentDate: string;
  expectedReturn: string;
  status: string;
}
export interface SentmachineFilters {
  searchTerm: string;
  status: string;
}
