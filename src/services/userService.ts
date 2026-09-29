import { apiClient } from '@/lib/apiClient';
import { CHECKLIST_TOKEN_KEY } from '@/lib/checklistApiClient';
import { allPermissionKeys, type UserPermissions } from '@/types/sheets';
import { GATEKEY_TO_PAGE_ID } from '@/lib/permissionMapping';

/**
 * User Service
 * Handles user management and administration via the dedicated /store/users backend routes.
 */

export interface UserRecord extends UserPermissions {
    id: number;
    timestamp: string;
    day_off?: string;
}

function normalizeFirmName(value: unknown) {
    return String(value || '').trim();
}

function normalizeFirmAccess(value: unknown) {
    return Array.isArray(value)
        ? value.map(normalizeFirmName).filter(Boolean)
        : [];
}

function applyDerivedUserAccess(user: any) {
    user.firmNameMatch = user.firm_access?.[0] || '';
    return user;
}

function mapUserRow(r: any): UserRecord {
    const role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' =
        (r.role === 'SUPER_ADMIN' || r.role === 'ADMIN' || r.role === 'USER')
            ? r.role
            : (r.administrate ? 'SUPER_ADMIN' : 'USER');

    const pageAccess = r.page_access && typeof r.page_access === 'object' ? r.page_access : {};
    const isSuperAdmin = role === 'SUPER_ADMIN' || r.administrate === true || (r.administrate as any) === 'true';
    const isAllPageAccess = pageAccess['ALL'] === 'EDIT' || pageAccess['all'] === 'EDIT' || pageAccess['ALL'] === 'VIEW' || pageAccess['all'] === 'VIEW';

    const systemAccessList: string[] = Array.isArray(r.system_access)
        ? [...r.system_access]
        : (typeof r.system_access === 'string' ? [r.system_access] : []);

    const user: any = {
        id: r.id,
        timestamp: r.timestamp || '',
        username: r.user_name || '',
        password: r.password || '',
        name: r.name || '',
        day_off: r.day_off || '',
        modify_access: (String(r.modify_access || 'EDIT').toUpperCase() === 'VIEW' ? 'VIEW' : 'EDIT'),
        firmNameMatch: '',
        firm_access: normalizeFirmAccess(r.firm_access),
        system_access: systemAccessList,
        page_access: pageAccess,
        rowIndex: r.id,
        role: role,
    };

    // Map each permission key from both DB legacy columns and unified page_access JSON
    allPermissionKeys.forEach((key) => {
        if (isSuperAdmin || isAllPageAccess) {
            user[key] = true;
            return;
        }

        // 1. Check legacy DB boolean columns
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        const rawColValue = r[dbKey];
        const isDbColTrue = rawColValue === true || (typeof rawColValue === 'string' && rawColValue.toLowerCase() === 'true');

        // 2. Check unified page_access JSON object
        const mappedPageId = GATEKEY_TO_PAGE_ID[key];
        const rawPageMode = (mappedPageId && pageAccess[mappedPageId]) ?? pageAccess[key] ?? pageAccess[dbKey];
        const pageMode = typeof rawPageMode === 'object' && rawPageMode !== null ? rawPageMode.mode : rawPageMode;

        let isPageAccessGranted = false;
        if (pageMode === 'EDIT' || pageMode === true || pageMode === 'true') {
            isPageAccessGranted = true;
        } else if (pageMode === 'VIEW' || pageMode === 'view') {
            // Action-only keys require EDIT mode
            const isActionOnlyKey = key.toLowerCase().endsWith('action');
            isPageAccessGranted = !isActionOnlyKey;
        }

        user[key] = isDbColTrue || isPageAccessGranted;
    });

    const activePerms: string[] = [];
    allPermissionKeys.forEach((key) => {
        if (user[key] === true) {
            activePerms.push(key);
        }
    });
    user.permissions = activePerms;

    // Ensure system_access includes systems corresponding to any granted pages
    if (isSuperAdmin && !user.system_access.includes('ALL')) {
        user.system_access.push('ALL');
    }

    const systemPrefixMap: Record<string, string[]> = {
        hr: ['hr_'],
        asset: ['asset_'],
        maintenance: ['maint_'],
        repair: ['repair_'],
        document: ['doc_'],
        petty_cash: ['petty_cash_'],
        checklist: ['checklist_'],
    };

    Object.entries(systemPrefixMap).forEach(([sysId, prefixes]) => {
        if (!user.system_access.includes(sysId)) {
            const hasAnyPage = Object.keys(pageAccess).some((p) =>
                prefixes.some((pfx) => p.startsWith(pfx))
            );
            if (hasAnyPage) {
                user.system_access.push(sysId);
            }
        }
    });

    return applyDerivedUserAccess(user) as UserRecord;
}

/**
 * Fetch all users
 */
export async function fetchUsers(): Promise<UserRecord[]> {
    try {
        const res: any = await apiClient.get('/store/users');
        return (res.data || []).map(mapUserRow);
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

/**
 * Create a new user
 */
export async function createUser(userData: Partial<UserPermissions>) {
    try {
        const userRole = userData.role || (userData.administrate ? 'SUPER_ADMIN' : 'USER');
        const dbRow: any = {
            user_name: userData.username,
            name: userData.name,
            password: userData.password,
            role: userRole,
            modify_access: (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userData.modify_access === 'EDIT') ? 'EDIT' : 'VIEW',
            firm_access: normalizeFirmAccess(userData.firm_access),
            system_access: userData.system_access || [],
            page_access: userData.page_access || {},
            timestamp: new Date().toISOString(),
        };

        // Map camelCase permissions to snake_case for DB
        allPermissionKeys.forEach(key => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            const value = userData[key as keyof UserPermissions];
            dbRow[dbKey] = value === true || value === 'true' || (value as any) === 'TRUE';
        });

        const res: any = await apiClient.post('/store/users', dbRow);
        return res.data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

/**
 * Update an existing user
 */
export async function updateUser(id: number, userData: Partial<UserPermissions>) {
    try {
        const userRole = userData.role || (userData.administrate ? 'SUPER_ADMIN' : 'USER');
        const dbRow: any = {
            user_name: userData.username,
            name: userData.name,
            password: userData.password,
            role: userRole,
            modify_access: (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userData.modify_access === 'EDIT') ? 'EDIT' : 'VIEW',
            firm_access: normalizeFirmAccess(userData.firm_access),
            system_access: userData.system_access || [],
            page_access: userData.page_access || {},
        };

        // Map camelCase permissions to snake_case for DB
        allPermissionKeys.forEach(key => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            const value = userData[key as keyof UserPermissions];
            dbRow[dbKey] = value === true || value === 'true' || (value as any) === 'TRUE';
        });

        await apiClient.patch(`/store/users/${id}`, dbRow);
        return true;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

/**
 * Delete a user
 */
export async function deleteUser(id: number) {
    try {
        await apiClient.delete(`/store/users/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

export async function authenticateUser(username: string, password: string): Promise<UserRecord | null> {
    try {
        const res: any = await apiClient.post('/store/users/authenticate', {
            username: (username || '').trim(),
            password: (password || '').trim(),
        });
        if (!res || !res.data) return null;

        // Backend also issues a short-lived JWT scoped to the new /checklist/*
        // routes alongside the legacy (unauthenticated) Store-module payload.
        if (res.checklistToken) {
            localStorage.setItem(CHECKLIST_TOKEN_KEY, res.checklistToken);
        } else {
            localStorage.removeItem(CHECKLIST_TOKEN_KEY);
        }

        return mapUserRow(res.data);
    } catch (error) {
        console.error('Error authenticating user:', error);
        throw error;
    }
}

/**
 * Fetch a user by username (for session restoration)
 */
export async function getUserByUsername(username: string): Promise<UserRecord | null> {
    try {
        const res: any = await apiClient.get(`/store/users/by-username/${encodeURIComponent(username)}`);
        if (!res.data) return null;

        if (res.checklistToken) {
            localStorage.setItem(CHECKLIST_TOKEN_KEY, res.checklistToken);
        } else {
            localStorage.removeItem(CHECKLIST_TOKEN_KEY);
        }

        return mapUserRow(res.data);
    } catch (error) {
        console.error('Error fetching user by username:', error);
        return null;
    }
}
