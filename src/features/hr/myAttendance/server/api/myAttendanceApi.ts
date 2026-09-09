import { api } from '@/lib/axios';

export interface MyAttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workingHours: number;
  overtime: number;
  notes: string | null;
  shift: { id: string; name: string; startTime: string; endTime: string } | null;
  // Only present for a multi-company identity user (see UserIdentity) —
  // absent for every individual company and every single-company session.
  tenant?: { id: string; name: string };
}

export const fetchMyToday = async (): Promise<MyAttendanceRecord | null> => {
  const res = await api.get('/hrfms/attendance/today');
  return res.data.data ?? null;
};

export const fetchMyMonthly = async (
  year: number,
  month: number
): Promise<MyAttendanceRecord[]> => {
  const res = await api.get('/hrfms/attendance/my-monthly', { params: { year, month } });
  return res.data.data ?? [];
};

export const selfCheckIn = async (): Promise<MyAttendanceRecord> => {
  const res = await api.post('/hrfms/attendance/checkin');
  return res.data.data;
};

export const selfCheckOut = async (): Promise<MyAttendanceRecord> => {
  const res = await api.patch('/hrfms/attendance/checkout');
  return res.data.data;
};
