// Dailyreport types
export interface DailyReportItem {
  id: number;
  date: string;
  indentNumber: string;
  machineName: string;
  technician: string;
  status: string;
  workDone: string;
}
export interface DailyReportFilters {
  date: string;
  technician: string;
}
