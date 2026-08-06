import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchChecklistTasks, type ChecklistTaskRow } from '@/services/checklistTaskService';
import { fetchDelegationTasks, type DelegationTaskRow } from '@/services/delegationTaskService';
import { fetchHolidays, type HolidayRow } from '@/services/holidayService';
import { fetchWorkingDays, type WorkingDayRow } from '@/services/workingCalendarService';
import { useAuth } from '@/context/AuthContext';

/**
 * Isolated data context for the Checklist & Delegation system module.
 *
 * Deliberately NOT folded into `SheetsContext` (which is scoped to the
 * Store module's spreadsheet-shaped data) — this context is only mounted
 * around the `/checklist/*` route subtree, so it never loads for users
 * working in other modules.
 */
interface ChecklistContextState {
    checklistTasks: ChecklistTaskRow[];
    delegationTasks: DelegationTaskRow[];
    holidays: HolidayRow[];
    workingDays: WorkingDayRow[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const ChecklistContext = createContext<ChecklistContextState | null>(null);

export const ChecklistProvider = ({ children }: { children: React.ReactNode }) => {
    const { loggedIn } = useAuth();
    const [checklistTasks, setChecklistTasks] = useState<ChecklistTaskRow[]>([]);
    const [delegationTasks, setDelegationTasks] = useState<DelegationTaskRow[]>([]);
    const [holidays, setHolidays] = useState<HolidayRow[]>([]);
    const [workingDays, setWorkingDays] = useState<WorkingDayRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [checklist, delegation, holidayRows, workingDayRows] = await Promise.all([
                fetchChecklistTasks().catch(() => []),
                fetchDelegationTasks().catch(() => []),
                fetchHolidays().catch(() => []),
                fetchWorkingDays().catch(() => []),
            ]);
            setChecklistTasks(checklist);
            setDelegationTasks(delegation);
            setHolidays(holidayRows);
            setWorkingDays(workingDayRows);
        } catch (err: any) {
            console.error('Error refreshing checklist data:', err);
            setError(err?.message || 'Failed to load checklist data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (loggedIn) {
            refresh();
        }
    }, [loggedIn, refresh]);

    return (
        <ChecklistContext.Provider
            value={{ checklistTasks, delegationTasks, holidays, workingDays, loading, error, refresh }}
        >
            {children}
        </ChecklistContext.Provider>
    );
};

export const useChecklistData = () => {
    const context = useContext(ChecklistContext);
    if (!context) {
        throw new Error('useChecklistData must be used within a ChecklistProvider');
    }
    return context;
};
