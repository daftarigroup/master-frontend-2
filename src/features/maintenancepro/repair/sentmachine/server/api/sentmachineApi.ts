import type { SentmachineItem } from '../../types/types';

const dummyData: SentmachineItem[] = [
  {
    id: 1,
    indentNumber: 'IN-001',
    machineName: 'CNC-305',
    vendor: 'Vendor A',
    sentDate: '2024-01-20',
    expectedReturn: '2024-01-27',
    status: 'In Transit',
  },
];
export const fetchSentmachines = async (): Promise<SentmachineItem[]> => {
  await new Promise((r) => setTimeout(r, 300));
  return dummyData;
};
