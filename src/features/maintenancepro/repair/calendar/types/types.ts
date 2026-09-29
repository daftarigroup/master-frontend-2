// Calendar types
export interface CalendarEvent {
  id: number | string;
  firmId?: string;
  title: string;
  date: string;
  type?: string;
  status: string;
  priority?: string;
  machineName?: string | null;
  vendorName?: string | null;
}
export interface CalendarFilters {
  month: number;
  year: number;
  type: string;
}
