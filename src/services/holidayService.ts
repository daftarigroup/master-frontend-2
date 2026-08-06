import { storeApi } from '@/lib/apiClient';

/**
 * Holiday Service
 *
 * Thin wrapper over the existing generic `/store/entity/holiday` routes —
 * this is a plain Master Settings lookup table, not part of the new
 * authenticated `/checklist/*` surface.
 */

export interface HolidayRow {
    id: number;
    holiday_date: string;
    holiday_name: string;
    created_at?: string;
}

export type HolidayRecord = HolidayRow;

export async function fetchHolidays(): Promise<HolidayRow[]> {
    return storeApi.fetch('holiday');
}

export async function createHoliday(data: { holiday_date: string; holiday_name: string }) {
    return storeApi.insert('holiday', data);
}

export async function updateHoliday(id: number, data: Partial<{ holiday_date: string; holiday_name: string }>) {
    return storeApi.update('holiday', id, data);
}

export async function deleteHoliday(id: number) {
    return storeApi.delete('holiday', id);
}
