/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserPermissions } from '@/types/sheets';
import {
    GATEKEY_TO_PAGE_ID,
    PAGE_ID_TO_GATEKEY,
    SYSTEM_PREFIXES,
    hasSystemAccess,
    isSystemPermitted,
    hasPageAccess,
} from '@/lib/permissions';

export {
    GATEKEY_TO_PAGE_ID,
    PAGE_ID_TO_GATEKEY,
    SYSTEM_PREFIXES,
    hasSystemAccess,
    isSystemPermitted,
    hasPageAccess,
};

export interface PermissionGuardProps {
    system?: string;
    page?: string;
    identifier?: keyof UserPermissions;
    requiredMode?: 'VIEW' | 'EDIT';
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Unified PermissionGuard component for conditional component rendering
 */
export function PermissionGuard({
    system,
    page,
    identifier,
    requiredMode = 'VIEW',
    children,
    fallback = null,
}: PermissionGuardProps) {
    const { user } = useAuth();

    // Check system access if specified
    if (system && !hasSystemAccess(user, system)) {
        return <>{fallback}</>;
    }

    // Check page or legacy identifier access if specified
    if ((page || identifier) && !hasPageAccess(user, page, requiredMode, identifier)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

export default PermissionGuard;
