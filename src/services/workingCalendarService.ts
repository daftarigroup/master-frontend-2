import { storeApi } from '@/lib/apiClient';

/**
 * Working Calendar Service
 *
 * Thin wrapper over the existing generic `/store/entity/working_day_calendar`
 * routes — plain Master Settings lookup table, no new backend code needed.
 */

export interface WorkingDayRow {
    id: number;
    working_date: string;
    day: string | null;
    week_num: number | null;
    month: number | null;
}

export async function fetchWorkingDays(): Promise<WorkingDayRow[]> {
    return storeApi.fetch('working_day_calendar');
}

export async function createWorkingDay(data: { working_date: string; day?: string; week_num?: number; month?: number }) {
    return storeApi.insert('working_day_calendar', data);
}

export async function updateWorkingDay(id: number, data: Partial<{ working_date: string; day: string; week_num: number; month: number }>) {
    return storeApi.update('working_day_calendar', id, data);
}

export async function deleteWorkingDay(id: number) {
    return storeApi.delete('working_day_calendar', id);
}
