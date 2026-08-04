import { apiClient } from '@/lib/apiClient';
import { allPermissionKeys, type UserPermissions } from '@/types/sheets';

/**
 * User Service
 * Handles user management and administration via the dedicated /store/users backend routes.
 */

export interface UserRecord extends UserPermissions {
    id: number;
    timestamp: string;
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
    const user: any = {
        id: r.id,
        timestamp: r.timestamp || '',
        username: r.user_name || '',
        password: r.password || '',
        name: r.name || '',
        modify_access: (String(r.modify_access || 'EDIT').toUpperCase() === 'VIEW' ? 'VIEW' : 'EDIT'),
        firmNameMatch: '',
        firm_access: normalizeFirmAccess(r.firm_access),
        rowIndex: r.id, // Using ID as a fallback for rowIndex since it's used in and out of tables
    };

    // Map each permission key from snake_case in DB to camelCase in UserPermissions
    allPermissionKeys.forEach((key) => {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        const value = r[dbKey];

        // Handle "true"/"TRUE"/true results
        user[key] = value === true ||
            (typeof value === 'string' && value.toLowerCase() === 'true');
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
        const dbRow: any = {
            user_name: userData.username,
            name: userData.name,
            password: userData.password,
            modify_access: userData.modify_access === 'VIEW' ? 'VIEW' : 'EDIT',
            firm_access: normalizeFirmAccess(userData.firm_access),
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
        const dbRow: any = {
            user_name: userData.username,
            name: userData.name,
            password: userData.password,
            modify_access: userData.modify_access === 'VIEW' ? 'VIEW' : 'EDIT',
            firm_access: normalizeFirmAccess(userData.firm_access),
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

/**
 * Authenticate a user with username and password
 */
export async function authenticateUser(username: string, password: string): Promise<UserRecord | null> {
    try {
        const res: any = await apiClient.post('/store/users/authenticate', { username, password });
        if (!res.data) return null;
        return mapUserRow(res.data);
    } catch (error) {
        console.error('Error authenticating user:', error);
        return null;
    }
}

/**
 * Fetch a user by username (for session restoration)
 */
export async function getUserByUsername(username: string): Promise<UserRecord | null> {
    try {
        const res: any = await apiClient.get(`/store/users/by-username/${encodeURIComponent(username)}`);
        if (!res.data) return null;
        return mapUserRow(res.data);
    } catch (error) {
        console.error('Error fetching user by username:', error);
        return null;
    }
}
