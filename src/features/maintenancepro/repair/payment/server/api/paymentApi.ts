import type { PaymentItem } from '../../types/types';

const dummyData: PaymentItem[] = [
  {
    id: 1,
    indentNumber: 'IN-001',
    machineName: 'CNC-305',
    vendor: 'Vendor A',
    amount: 25000,
    paymentDate: '2024-01-22',
    status: 'Pending',
    invoiceNo: 'INV-001',
  },
];
export const fetchPayments = async (): Promise<PaymentItem[]> => {
  await new Promise((r) => setTimeout(r, 300));
  return dummyData;
};
