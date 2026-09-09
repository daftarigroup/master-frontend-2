// Replaced by server/tanstackQuery/useMyAttendanceQueries.ts

export interface AttendanceStat {
  title: string;
  value: string | number;
  color: string;
}

export interface AttendanceRecord {
  date: string;
  status: string;
  checkIn: string;
  checkOut: string;
  hours: string;
}
