// Payment types
export interface PaymentItem {
  id: number;
  indentNumber: string;
  machineName: string;
  vendor: string;
  amount: number;
  paymentDate: string;
  status: string;
  invoiceNo: string;
}
export interface PaymentFilters {
  searchTerm: string;
  status: string;
}
