import type { StoreinItem } from '../../types/types';

const dummyData: StoreinItem[] = [
  {
    id: 1,
    indentNumber: 'IN-001',
    machineName: 'CNC-305',
    returnedDate: '2024-01-22',
    condition: 'Good',
    inspectedBy: 'QC Team',
    remarks: 'All ok',
  },
];
export const fetchStorein = async (): Promise<StoreinItem[]> => {
  await new Promise((r) => setTimeout(r, 300));
  return dummyData;
};
